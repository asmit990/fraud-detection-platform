import "dotenv/config";
import express from "express";
import cors from "cors";
import pool, { initDb } from "./db";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT ?? 3004;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

async function start(): Promise<void> {
  try {
    await pool.connect();
    console.log("Postgres connected");

    await initDb();
    console.log("Database initialized");

    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
