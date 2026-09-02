import "dotenv/config";
import pool from "./db";
import redis from "./redis";
import { connectConsumer, connectProducer, startConsumer } from "./kafka";
import { fraudEngine } from "./engine/fraudEngine";
import { Transaction } from "./types";

async function start(): Promise<void> {
  try {
    await pool.connect();
    console.log("Postgres connected");

    await redis.ping();
    console.log("Redis connected");

    await connectProducer();
    await connectConsumer();


    await startConsumer(async (raw: string) => {
      const transaction = JSON.parse(raw) as Transaction;
      if (!transaction.id || !transaction.user_id) {
        throw new Error("malformed transaction: missing id")
      }
      await fraudEngine(transaction);
    });

    console.log("Fraud service running...");

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();