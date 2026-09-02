import "dotenv/config";
import express from "express";
import cors from "cors";
import pool, { initDb } from "./db";
import blockRouter from "./routes/block.routes";
import transactionRoutes from "./routes/transaction.routes";
import { connectProducer } from "./kafka";
import { authMiddleware } from "./middleware/authMiddleware";
import webhookRouter from "./routes/webhook.routes";
import { startOutboxRelay } from "./outboxRelay";

const app = express();

app.use(cors());
app.use("/webhook", webhookRouter);
app.use(express.json());

const PORT = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/transactions", authMiddleware, transactionRoutes);
app.use("/api/transactions", authMiddleware, blockRouter);

async function start() {
  try {

    await pool.connect();
    console.log("Postgres connected");


    await initDb();
    console.log("Database initialized");


    await connectProducer();
    console.log("Kafka connected");


    startOutboxRelay();
    console.log("Outbox relay worker started");


    app.listen(PORT, () => {
      console.log(`Transaction service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();