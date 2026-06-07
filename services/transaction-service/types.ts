//Transaction interface
   //     id, user_id, amount, currency,
   //     country, device_id, timestamp,
   //     risk_score, fraud_status



   interface Transaction {
    id: string,
    user_id: string,
    amount: number,
    currency: string,
    country: string,
    device_id: string,
    timestamp: Date,
    risk_score: number,
    fraud_status: "fraud" | "legit"
        }