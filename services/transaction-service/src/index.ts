import "dotenv/config";
import express from "express";
import pool from "./db";
import transactionRoutes from "./routes/transaction.routes";
import { connectProducer } from "./kafka";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3001;

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/transactions", transactionRoutes);

async function start() {
try {
    // connect to postgres
    await pool.connect();
    console.log("Postgres connected");

    // connect kafka producer ONCE
    await connectProducer();
    console.log("Kafka connected");

    // start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);   
  }


}

start();




   