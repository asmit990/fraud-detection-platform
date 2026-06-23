import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./database/db";
import analyticsRoutes from "./routes/analytics.routes";
import { authMiddleware } from "./middleware/authMiddleware";

const app = express();

app.use(express.json());
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "ok hai darling" });
});

// All /api/* routes require a valid JWT
app.use("/api/analytics", authMiddleware, analyticsRoutes);

const PORT = process.env.PORT ?? 3003;

async function start(): Promise<void> {
  try {
    await pool.connect();
    console.log("Postgres connected");

    app.listen(PORT, () => {
      console.log(`Analytics service running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
