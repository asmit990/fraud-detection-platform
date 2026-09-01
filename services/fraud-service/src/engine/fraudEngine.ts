import pool from "../db";
import redis from "../redis";
import { Transaction } from "../types";
import { createAlert } from "../services/alertService";
import largeAmountRule from "../rules/largeAmount";
import velocityRule from "../rules/velocity";
import geoAnomalyRule from "../rules/geoAnomaly";
import deviceAnomalyRule from "../rules/deviceAnomaly";
import { nightActivityRule } from "../rules/nightActivity";
import { callGemini } from "../services/geminiService";
import { ipReputation } from "../rules/ipReputation";
import { 
  multipleFailedAttemptsRule,
  recordFailedAttempt,
  resetFailedAttempts
} from "../rules/multipleFailedAttempts";
import { unusualMerchantRule } from "../rules/unusualMerchant";

export async function fraudEngine(transaction: Transaction): Promise<void> {
  // 1. Consumer-Side Deduplication (Guarantees Exactly-Once Processing for At-Least-Once Kafka Streams)
  const dedupKey = `processed_events:${transaction.id}`;
  const isFirstProcessing = await redis.set(dedupKey, "1", "EX", 86400, "NX");
  
  if (!isFirstProcessing) {
    console.log(`[fraudEngine] Duplicate event detected for transaction ${transaction.id}. Skipping.`);
    return;
  }

  // 2. Evaluate all 8 deterministic fraud rules in parallel
  const [
    largeAmountScore,
    velocityScore,
    geoScore,
    deviceScore,
    nightScore,
    ipScore,
    failedScore,
    merchantScore
  ] = await Promise.all([
    largeAmountRule(transaction),
    velocityRule(transaction.user_id),
    geoAnomalyRule(transaction.user_id, transaction.country),
    deviceAnomalyRule(transaction.user_id, transaction.device_id, undefined, transaction.ip),
    nightActivityRule(transaction),
    ipReputation(transaction.ip || ""),
    multipleFailedAttemptsRule(transaction.user_id),
    unusualMerchantRule(
      transaction.user_id,
      transaction.merchant_category || "general"
    ),
  ]);

  const ruleScore =
    largeAmountScore +
    velocityScore +
    geoScore +
    deviceScore +
    nightScore +
    ipScore +
    failedScore +
    merchantScore;

  // 3. Evaluate Google Gemini ML inference with timeout & fallback resilience
  let mlResult = {
    fraud_probability: 0,
    reason: "ML unavailable",
  };

  try {
    mlResult = await callGemini(transaction);
  } catch (err) {
    console.warn("Gemini execution caught error — using rules only:", err);
  }

  const mlScore = mlResult.fraud_probability * 100;
  const finalScore = Math.min(100, Math.round(ruleScore * 0.4 + mlScore * 0.6));

  const fraudStatus =
    finalScore >= 61 ? "HIGH" : finalScore >= 31 ? "MEDIUM" : "LOW";

  const reasons: string[] = [];
  if (largeAmountScore > 0) reasons.push("large amount");
  if (velocityScore > 0) reasons.push("velocity fraud");
  if (geoScore > 0) reasons.push("geo anomaly");
  if (deviceScore > 0) reasons.push("unknown device");
  if (nightScore > 0) reasons.push("night activity");
  if (ipScore > 0) reasons.push("suspicious IP");
  if (failedScore > 0) reasons.push("multiple failed attempts");
  if (merchantScore > 0) reasons.push("unusual merchant category");
  if (mlResult.reason && !mlResult.reason.includes("unavailable")) {
    reasons.push(`ML: ${mlResult.reason}`);
  }

  // 4. Update Postgres database with final risk score and status
  await pool.query(
    `UPDATE transactions
     SET risk_score = $1, fraud_status = $2
     WHERE id = $3`,
    [finalScore, fraudStatus, transaction.id]
  );

  console.log(`Transaction ${transaction.id} → Score: ${finalScore} → Status: ${fraudStatus}`);
  console.log(`Reasons: ${reasons.join(", ") || "none"}`);

  // 5. Trigger alert and failure tracking on HIGH risk
  if (fraudStatus === "HIGH") {
    await createAlert(transaction, reasons, finalScore);
    await recordFailedAttempt(transaction.user_id);
  } else {
    await resetFailedAttempts(transaction.user_id);
  }
}