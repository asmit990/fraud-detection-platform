import "dotenv/config";
import express from "express";
import cors from "cors";
import pool, { initDb } from "./db";
import transactionRoutes from "./routes/transaction.routes";
import { connectProducer } from "./kafka";
import { authMiddleware } from "./middleware/authMiddleware";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT ?? 3001;

// Health check — public
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// All /api/* routes require a valid JWT
app.use("/api/transactions", authMiddleware, transactionRoutes);

async function start() {
try {
    // connect to postgres
    await pool.connect();
    console.log("Postgres connected");

    // initialize database tables
    await initDb();
    console.log("Database initialized");

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




   