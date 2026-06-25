import pool from "../db";
import { Transaction } from "../types";
import { createAlert } from "../services/alertService";
import  largeAmountRule  from "../rules/largeAmount";
import  velocityRule from "../rules/velocity";
import  geoAnomalyRule  from "../rules/geoAnomaly";
import  deviceAnomalyRule  from "../rules/deviceAnomaly";
import  { nightActivityRule } from "../rules/nightActivity";
import  { callGemini } from "../services/geminiService";

export async function fraudEngine(transaction: Transaction): Promise<void> {


  const [
    largeAmountScore,
    velocityScore,
    geoScore,
    deviceScore,
    nightScore
  ] = await Promise.all([
    largeAmountRule(transaction),
    velocityRule(transaction.user_id),
    geoAnomalyRule(transaction.user_id, transaction.country),
    deviceAnomalyRule(transaction.user_id, transaction.device_id),
    nightActivityRule(transaction)
  ]);


  const ruleScore = largeAmountScore + velocityScore + geoScore + deviceScore + nightScore;

  
  let mlResult = { 
    fraud_probability: 0, 
    reason: "ML unavailable" 
     }

  

   try {
    mlResult = await callGemini(transaction)
   } catch(err) {
    console.log('Gemini failed — using rules only')

   }
  
   const mlScore = mlResult.fraud_probability * 100;


  const finalScore = Math.round((ruleScore * 0.4) + (mlScore * 0.6));

  
  const fraudStatus =
    finalScore >= 61 ? "HIGH"   :
    finalScore >= 31 ? "MEDIUM" : "LOW";

  // reasons
  const reasons: string[] = [];
  if (largeAmountScore > 0) reasons.push("large amount");
  if (velocityScore > 0)    reasons.push("velocity fraud");
  if (geoScore > 0)         reasons.push("geo anomaly");
  if (deviceScore > 0)      reasons.push("unknown device");
  if (nightScore > 0)       reasons.push("night activity");
  if (mlResult.reason !== "AI MODEL IS unavailable") reasons.push(`ML: ${mlResult.reason}`);

  // update postgres
  await pool.query(
    `UPDATE transactions
     SET risk_score = $1, fraud_status = $2
     WHERE id = $3`,
    [finalScore, fraudStatus, transaction.id]
  );

  console.log(`Transaction ${transaction.id} → score: ${finalScore} → ${fraudStatus}`);
  console.log(`Reasons: ${reasons.join(", ") || "none"}`);

  // alert if high
  if (fraudStatus === "HIGH") {
    await createAlert(transaction, reasons.join(", "));
  }
}