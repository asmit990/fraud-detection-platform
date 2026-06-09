
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



export interface FraudResult {
  ruleScore: number;
  finalScore: number;
  status: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}
