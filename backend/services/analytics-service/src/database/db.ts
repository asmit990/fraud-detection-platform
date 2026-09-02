import {Pool} from "pg"
import "dotenv/config";


const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});



export async function initDB(): Promise<void> {
  await pool.query(`
    -- summary
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE fraud_status = 'HIGH') as total_frauds,
  ROUND(AVG(risk_score), 2) as avg_risk_score,
  COUNT(*) FILTER (WHERE fraud_status = 'HIGH') as high_risk,
  COUNT(*) FILTER (WHERE fraud_status = 'MEDIUM') as medium_risk,
  COUNT(*) FILTER (WHERE fraud_status = 'LOW') as low_risk
FROM transactions;

-- trends (last 7 days)
SELECT
  DATE(timestamp) as date,
  COUNT(*) as fraud_count
FROM transactions
WHERE fraud_status = 'HIGH'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date ASC;

-- countries
SELECT
  country,
  COUNT(*) as fraud_count
FROM transactions
WHERE fraud_status = 'HIGH'
GROUP BY country
ORDER BY fraud_count DESC;
`);
}


export default pool;
