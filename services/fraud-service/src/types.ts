export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  country: string;
  device_id: string;
  timestamp: string;
  risk_score: number;
  fraud_status: string;
  created_at: string;
}

export interface FraudResult {
  ruleScore: number;
  finalScore: number;
  status: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}
