// Transaction row as stored in Postgres
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  country: string;
  device_id: string;
  timestamp: Date;
  risk_score: number;
  fraud_status: "PENDING" | "FRAUD" | "LEGIT";
  created_at: Date;
}

// Alert row as stored in Postgres
export interface Alert {
  id: string;
  transaction_id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  created_at: Date;
}

// Body expected when creating a transaction
export interface CreateTransactionBody {
  user_id: string;
  amount: number;
  currency?: string;
  country: string;
  device_id: string;
}
