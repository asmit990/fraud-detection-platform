import { Pool } from "pg";
import "dotenv/config";
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    -- transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      VARCHAR(100) NOT NULL,
      amount       DECIMAL(12,2) NOT NULL,
      currency     VARCHAR(10)  DEFAULT 'INR',
      country      VARCHAR(100) NOT NULL,
      device_id    VARCHAR(255) NOT NULL,
      timestamp    TIMESTAMPTZ  DEFAULT NOW(),
      risk_score   DECIMAL(5,2) DEFAULT 0,
      fraud_status VARCHAR(20)  DEFAULT 'PENDING',
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    );

    -- alerts table
    CREATE TABLE IF NOT EXISTS alerts (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID        REFERENCES transactions(id),
      severity       VARCHAR(20) NOT NULL,
      message        TEXT        NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );



    -- init.sql mein fraud_status check update karo
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_fraud_status_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_fraud_status_check 
CHECK (fraud_status IN ('PENDING', 'LOW', 'MEDIUM', 'HIGH', 'BLOCKED'));



    -- indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id
      ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_timestamp
      ON transactions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_transactions_fraud_status
      ON transactions(fraud_status);
    CREATE INDEX IF NOT EXISTS idx_alerts_transaction_id
      ON alerts(transaction_id);



  `);
}

export default pool;