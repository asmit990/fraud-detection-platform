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
      id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         VARCHAR(100) NOT NULL,
      amount          DECIMAL(12,2) NOT NULL,
      currency        VARCHAR(10)  DEFAULT 'INR',
      country         VARCHAR(100) NOT NULL,
      device_id       VARCHAR(255) NOT NULL,
      timestamp       TIMESTAMPTZ  DEFAULT NOW(),
      risk_score      DECIMAL(5,2) DEFAULT 0,
      fraud_status    VARCHAR(20)  DEFAULT 'PENDING',
      idempotency_key VARCHAR(255) UNIQUE,
      created_at      TIMESTAMPTZ  DEFAULT NOW()
    );

    -- Ensure idempotency_key column exists if table was created in an earlier migration
    ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

    -- alerts table
    CREATE TABLE IF NOT EXISTS alerts (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID        REFERENCES transactions(id),
      severity       VARCHAR(20) NOT NULL,
      message        TEXT        NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    -- outbox_events table (Transactional Outbox Pattern)
    CREATE TABLE IF NOT EXISTS outbox_events (
      id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      aggregate_id UUID         NOT NULL,
      event_type   VARCHAR(100) NOT NULL,
      payload      JSONB        NOT NULL,
      metadata     JSONB        DEFAULT '{}',
      created_at   TIMESTAMPTZ  DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );

    -- Enterprise Idempotency Keys table (Stripe / IETF RFC Specification)
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key           VARCHAR(255) PRIMARY KEY,
      user_id       VARCHAR(100),
      request_path  VARCHAR(255) NOT NULL,
      request_hash  VARCHAR(64)  NOT NULL,
      status        VARCHAR(20)  NOT NULL CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
      response_code INT,
      response_body JSONB,
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      expires_at    TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '24 HOURS')
    );

    -- Update fraud status check constraint
    ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_fraud_status_check;

    ALTER TABLE transactions 
      ADD CONSTRAINT transactions_fraud_status_check 
      CHECK (fraud_status IN ('PENDING', 'LOW', 'MEDIUM', 'HIGH', 'BLOCKED'));

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key
      ON transactions(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
      ON idempotency_keys(expires_at);

    CREATE INDEX IF NOT EXISTS idx_transactions_user_id
      ON transactions(user_id);

    CREATE INDEX IF NOT EXISTS idx_transactions_timestamp
      ON transactions(timestamp);

    CREATE INDEX IF NOT EXISTS idx_transactions_fraud_status
      ON transactions(fraud_status);

    CREATE INDEX IF NOT EXISTS idx_alerts_transaction_id
      ON alerts(transaction_id);

    CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
      ON outbox_events (created_at)
      WHERE published_at IS NULL;
  `);
}

export default pool;