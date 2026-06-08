import { Request, Response } from "express";
import pool from "../db";
import { connectProducer, publishMessage } from "../kafka";
import { Transaction, CreateTransactionBody } from "../types";

// POST /transactions
export async function createTransaction(
  req: Request<{}, {}, CreateTransactionBody>,
  res: Response
): Promise<void> {
  const { user_id, amount, currency = "INR", country, device_id } = req.body;

  if (!user_id || amount === undefined || !country || !device_id) {
    res.status(400).json({ message: "Missing required fields: user_id, amount, country, device_id" });
    return;
  }

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ message: "amount must be a positive number" });
    return;
  }

  try {
    const result = await pool.query<Transaction>(
      `INSERT INTO transactions (user_id, amount, currency, country, device_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, amount, currency, country, device_id]
    );

    const transaction = result.rows[0];


    try {
      await publishMessage(process.env.KAFKA_TOPIC ?? "transactions", transaction);
    } catch (kafkaErr) {

      console.error("Kafka publish failed:", kafkaErr);
    }

    res.status(201).json({ transaction });
  } catch (err) {
    console.error("createTransaction error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /transactions
export async function getTransactions(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, fraud_status, limit = "50", offset = "0" } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user_id) {
    params.push(user_id);
    conditions.push(`user_id = $${params.length}`);
  }

  if (fraud_status) {
    params.push((fraud_status as string).toUpperCase());
    conditions.push(`fraud_status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // pagination params
  params.push(parseInt(limit as string, 10) || 50);
  const limitIdx = params.length;
  params.push(parseInt(offset as string, 10) || 0);
  const offsetIdx = params.length;

  try {
    const result = await pool.query<Transaction>(
      `SELECT * FROM transactions
       ${where}
       ORDER BY timestamp DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    res.json({ transactions: result.rows, count: result.rowCount });
  } catch (err) {
    console.error("getTransactions error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /transactions/:id
export async function getTransactionById(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const { id } = req.params;

  try {
    const txResult = await pool.query<Transaction>(
      `SELECT * FROM transactions WHERE id = $1`,
      [id]
    );

    if (txResult.rowCount === 0) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    // Also fetch associated alerts
    const alertResult = await pool.query(
      `SELECT * FROM alerts WHERE transaction_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      transaction: txResult.rows[0],
      alerts: alertResult.rows,
    });
  } catch (err) {
    console.error("getTransactionById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
