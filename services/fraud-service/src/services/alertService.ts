import pool from "../db";
import { Transaction } from "../types";
import redisClient from "../redis";
export async function createAlert(
  transaction: Transaction,
  reason: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO alerts (transaction_id, severity, message)
       VALUES ($1, $2, $3)`,
      [
        transaction.id,
        "HIGH",
        `High risk transaction for user ${transaction.user_id}. Reason: ${reason}`
      ]
    );

    console.log(`Alert created for transaction ${transaction.id}`);
    redisClient.publish(
      "alerts",
      JSON.stringify({
        transaction_id: transaction.id,
        severity: "HIGH",
        message: `High risk transaction for user ${transaction.user_id}. Reason: ${reason}`
      })
    );

  } catch (err) {
    console.error("Failed to create alert:", err);
  }
}