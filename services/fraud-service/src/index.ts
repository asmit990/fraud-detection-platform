import "dotenv/config";
import pool from "./db";
import redis from "./redis";
import { connectConsumer, startConsumer } from "./kafka";
import { fraudEngine } from "./engine/fraudEngine";
import { Transaction } from "./types";

async function start(): Promise<void> {
  try {
    await pool.connect();
    console.log("Postgres connected");

    await redis.ping();
    console.log("Redis connected");

    await connectConsumer();

    // pass fraudEngine as the handler
    await startConsumer(async (raw: string) => {
      const transaction = JSON.parse(raw) as Transaction;
      await fraudEngine(transaction);
    });

    console.log("Fraud service running...");

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();