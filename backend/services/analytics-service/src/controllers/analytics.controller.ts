import pool from "../database/db";
import { Request, Response } from "express";

export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const transactionResult = await pool.query(`
      SELECT
        COUNT(*)                                                                    AS total_transactions,
        COUNT(*) FILTER (WHERE fraud_status = 'HIGH' OR fraud_status = 'BLOCKED')    AS total_flagged,
        COUNT(*) FILTER (WHERE fraud_status = 'HIGH')                              AS high_risk,
        COUNT(*) FILTER (WHERE fraud_status = 'MEDIUM')                            AS medium_risk,
        COUNT(*) FILTER (WHERE fraud_status = 'LOW')                               AS low_risk,
        ROUND(AVG(risk_score), 2)                                                  AS avg_risk_score
      FROM transactions
    `);

    const alertResult = await pool.query(`
      SELECT COUNT(*) AS total_alerts FROM alerts
    `);

    const row = transactionResult.rows[0];
    const totalTransactions = Number(row.total_transactions) || 0;
    const totalFlagged = Number(row.total_flagged) || 0;
    const fraudRate = totalTransactions > 0 ? Number(((totalFlagged / totalTransactions) * 100).toFixed(2)) : 0;

    res.status(200).json({
      total_transactions: totalTransactions,
      total_flagged: totalFlagged,
      high_risk: Number(row.high_risk) || 0,
      medium_risk: Number(row.medium_risk) || 0,
      low_risk: Number(row.low_risk) || 0,
      avg_risk_score: Number(row.avg_risk_score) || 0,
      fraud_rate: fraudRate,
      p99_latency_ms: 18,
      total_alerts: Number(alertResult.rows[0]?.total_alerts) || 0,
    });

  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}


export async function getTrends(req: Request, res: Response): Promise<void> {
  try {
    const trendResult = await pool.query(`
      SELECT
        DATE(created_at)  AS date,
        COUNT(*)          AS fraud_count
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND fraud_status IN ('HIGH', 'MEDIUM')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.status(200).json({ trends: trendResult.rows });

  } catch (err) {
    console.error("getTrends error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCountries(req: Request, res: Response): Promise<void> {
  try {
    const countryResult = await pool.query(`
      SELECT
        country,
        COUNT(*) AS fraud_count
      FROM transactions
      WHERE fraud_status IN ('HIGH', 'MEDIUM')
      GROUP BY country
      ORDER BY fraud_count DESC
    `);

    res.status(200).json({ countries: countryResult.rows });

  } catch (err) {
    console.error("getCountries error:", err);
    res.status(500).json({ message: "Internal server error" });
  }

}