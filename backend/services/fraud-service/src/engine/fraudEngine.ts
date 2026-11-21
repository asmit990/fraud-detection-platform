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
  const dedupKey = `processed_events:${transaction.id}`;
  const isFirstProcessing = await redis.set(dedupKey, "1", "EX", 86400, "NX");

  if (!isFirstProcessing) {
    console.log(`[fraudEngine] Duplicate event detected for transaction ${transaction.id}. Skipping.`);
    return;
  }


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

  let mlResult = {
    fraud_probability: 0,
    reason: "ML unavailable",
  };
  let isMlAvailable = false;

  try {
    mlResult = await callGemini(transaction);
    const reasonLower = (mlResult.reason || "").toLowerCase();
    isMlAvailable =
      !reasonLower.includes("unavailable") &&
      !reasonLower.includes("timed out") &&
      !reasonLower.includes("rate limited") &&
      !reasonLower.includes("empty response");
  } catch (err) {
    console.warn("Gemini execution caught error — using rules only:", err);
    isMlAvailable = false;
  }

  const mlScore = mlResult.fraud_probability * 100;

  const finalScore = isMlAvailable
    ? Math.min(100, Math.round(ruleScore * 0.4 + mlScore * 0.6))
    : Math.min(100, ruleScore);

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
  if (isMlAvailable && mlResult.reason) {
    reasons.push(`ML: ${mlResult.reason}`);
  }

  await pool.query(
    `UPDATE transactions
     SET risk_score = $1, fraud_status = $2
     WHERE id = $3`,
    [finalScore, fraudStatus, transaction.id]
  );

  console.log(`Transaction ${transaction.id} → Score: ${finalScore} → Status: ${fraudStatus}`);
  console.log(`Reasons: ${reasons.join(", ") || "none"}`);

  if (fraudStatus === "HIGH") {
    await createAlert(transaction, reasons, finalScore);
    await recordFailedAttempt(transaction.user_id);
  } else {
    await resetFailedAttempts(transaction.user_id);
  }
}