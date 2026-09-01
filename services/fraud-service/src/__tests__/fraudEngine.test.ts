jest.mock("../db", () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock("../redis", () => ({
  __esModule: true,
  default: {
    set: jest.fn(),
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    sadd: jest.fn(),
    scard: jest.fn(),
  },
}));
jest.mock("../services/alertService", () => ({
  __esModule: true,
  createAlert: jest.fn(),
}));
jest.mock("../services/geminiService", () => ({
  __esModule: true,
  callGemini: jest.fn(),
}));

import { fraudEngine } from "../engine/fraudEngine";
import redis from "../redis";
import pool from "../db";
import { createAlert } from "../services/alertService";
import { callGemini } from "../services/geminiService";
import { Transaction } from "../types";

describe("Fraud Engine Orchestrator", () => {
  const sampleTx: Transaction = {
    id: "txn-101",
    user_id: "usr-101",
    amount: 50000,
    currency: "INR",
    country: "RU",
    device_id: "dev-99",
    timestamp: "2026-09-01T03:00:00Z",
    risk_score: 0,
    fraud_status: "PENDING",
    created_at: "2026-09-01T03:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should skip duplicate Kafka events when Redis SET NX returns null", async () => {
    (redis.set as jest.Mock).mockResolvedValueOnce(null);

    await fraudEngine(sampleTx);

    expect(redis.set).toHaveBeenCalledWith("processed_events:txn-101", "1", "EX", 86400, "NX");
    expect(pool.query).not.toHaveBeenCalled();
    expect(createAlert).not.toHaveBeenCalled();
  });

  it("should evaluate rules + AI and update DB with HIGH status and trigger alerts", async () => {
    (redis.set as jest.Mock).mockResolvedValueOnce("OK");
    (redis.get as jest.Mock).mockResolvedValue(null);
    (redis.incr as jest.Mock).mockResolvedValue(1);
    (redis.smembers as jest.Mock).mockResolvedValue([]);
    (redis.sismember as jest.Mock).mockResolvedValue(0);

    (callGemini as jest.Mock).mockResolvedValueOnce({
      fraud_probability: 0.9,
      reason: "High risk profile detected",
    });

    await fraudEngine(sampleTx);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE transactions"),
      expect.arrayContaining(["HIGH", sampleTx.id])
    );
    expect(createAlert).toHaveBeenCalledTimes(1);
  });
});
