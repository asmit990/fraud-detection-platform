import pool from "../db";
import { Transaction } from "../types";
import { createAlert } from "../services/alertService";
import  largeAmountRule  from "../rules/largeAmount";
import  velocityRule  from "../rules/velocity";
import  geoAnomalyRule  from "../rules/geoAnomaly";
import  deviceAnomalyRule  from "../rules/deviceAnomaly";
import  {nightActivityRule} from "../rules/nightActivity";

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


  const totalScore =
    largeAmountScore +
    velocityScore +
    geoScore +
    deviceScore +
    nightScore;


  const fraudStatus =
    totalScore >= 61 ? "HIGH"   :
    totalScore >= 31 ? "MEDIUM" : "LOW";


  const reasons: string[] = [];
  if (largeAmountScore > 0) reasons.push("large amount");
  if (velocityScore > 0)    reasons.push("velocity fraud");
  if (geoScore > 0)         reasons.push("geo anomaly");
  if (deviceScore > 0)      reasons.push("unknown device");
  if (nightScore > 0)       reasons.push("night activity");


  await pool.query(
    `UPDATE transactions
     SET risk_score = $1, fraud_status = $2
     WHERE id = $3`,
    [totalScore, fraudStatus, transaction.id]
  );

  console.log(`Transaction ${transaction.id} → score: ${totalScore} → ${fraudStatus}`);
  console.log(`Reasons: ${reasons.join(", ") || "none"}`);

  // alert if high risk
  if (fraudStatus === "HIGH") {
    await createAlert(transaction, reasons.join(", "));
  }
}