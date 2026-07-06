import pool from "../db";
import { Transaction } from "../types";
import { publishAlert } from "../kafka";

export interface AlertPayload {
  transaction_id: string;
  user_id: string;
  amount: number;
  country: string;
  risk_score: number;
  reasons: string[];
  severity: "HIGH";
  timestamp: string;
}

/**
 * Build the alert payload consumed by the alert/email service. Pure function so
 * it can be unit-tested without touching Postgres or Kafka.
 */
export function buildAlertPayload(
  transaction: Transaction,
  reasons: string[],
  riskScore: number
): AlertPayload {
  return {
    transaction_id: transaction.id,
    user_id: transaction.user_id,
    amount: Number(transaction.amount),
    country: transaction.country,
    risk_score: riskScore,
    reasons,
    severity: "HIGH",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Persist a HIGH-risk alert to Postgres and publish it to Kafka for the
 * alert/email service to deliver. Failures are logged but never thrown so a
 * downstream outage cannot crash the fraud engine.
 */
export async function createAlert(
  transaction: Transaction,
  reasons: string[],
  riskScore: number
): Promise<void> {
  const reasonText = reasons.join(", ") || "unspecified";

  try {
    await pool.query(
      `INSERT INTO alerts (transaction_id, severity, message)
       VALUES ($1, $2, $3)`,
      [
        transaction.id,
        "HIGH",
        `High risk transaction for user ${transaction.user_id}. Reason: ${reasonText}`,
      ]
    );
    console.log(`Alert created for transaction ${transaction.id}`);
  } catch (err) {
    console.error("Failed to persist alert:", err);
  }

  try {
    await publishAlert(buildAlertPayload(transaction, reasons, riskScore));
    console.log(`Alert published for transaction ${transaction.id}`);
  } catch (err) {
    console.error("Failed to publish alert to Kafka:", err);
  }
}
