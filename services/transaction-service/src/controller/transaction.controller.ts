import { Request, Response } from "express";
import pool from "../db";
import { publishMessage } from "../kafka";
import { Transaction, CreateTransactionBody } from "../types";

export async function createTransaction(
  req: Request<{}, {}, CreateTransactionBody>,
  res: Response
): Promise<void> {
  const { user_id, amount, currency = "INR", country, device_id } = req.body;
  const idepkey = req.header("Idempotency-Key") || req.header("idempotency-key");

  if (!user_id || amount === undefined || !country || !device_id) {
    res.status(400).json({ message: "Missing required fields: user_id, amount, country, device_id" });
    return;
  }

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ message: "amount must be a positive number" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert transaction with idempotency key
    const txnResult = await client.query<Transaction>(
      `INSERT INTO transactions (user_id, amount, currency, country, device_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, amount, currency, country, device_id, idepkey?.trim() ?? null]
    );

    const transaction = txnResult.rows[0];

    // Transactional Outbox: Insert event atomically
    await client.query(
      `INSERT INTO outbox_events (aggregate_id, event_type, payload)
       VALUES ($1, $2, $3)`,
      [transaction.id, "transaction.created", JSON.stringify(transaction)]
    );

    await client.query("COMMIT");

    // Optional direct Kafka publish for immediate processing (relay acts as guarantee)
    try {
      await publishMessage(process.env.KAFKA_TOPIC ?? "transactions", transaction);
    } catch (kafkaErr) {
      console.warn("Direct Kafka publish failed, outbox relay will deliver:", kafkaErr);
    }

    res.status(201).json({ transaction });
  } catch (err: any) {
    await client.query("ROLLBACK");

    // Handle database unique constraint conflict if idempotency_key was duplicated
    if (err.code === "23505" && idepkey) {
      const existing = await pool.query<Transaction>(
        `SELECT * FROM transactions WHERE idempotency_key = $1`,
        [idepkey.trim()]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        res.status(200).json({
          message: "Transaction already processed",
          transaction: existing.rows[0],
        });
        return;
      }
    }

    console.error("createTransaction error:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
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

// GET /transactions/alerts
export async function getAlerts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error("getAlerts error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
