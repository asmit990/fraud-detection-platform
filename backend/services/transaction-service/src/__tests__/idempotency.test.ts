import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { idempotencyMiddleware } from "../middleware/idempotencyMiddleware";
import pool from "../db";

jest.mock("../db", () => ({
  query: jest.fn(),
}));

describe("Enterprise Idempotency Middleware (Stripe / IETF Standard)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      header: jest.fn(),
      baseUrl: "/api/transactions",
      path: "/",
      method: "POST",
      body: { user_id: "user-123", amount: 100, country: "US", device_id: "dev-1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      statusCode: 200,
    };

    next = jest.fn();
  });

  it("should bypass idempotency check if Idempotency-Key header is absent", async () => {
    (req.header as jest.Mock).mockReturnValue(undefined);

    idempotencyMiddleware(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("should return cached response with Idempotency-Replay header when COMPLETED", async () => {
    const key = "idem-key-123";
    (req.header as jest.Mock).mockReturnValue(key);

    const payload = JSON.stringify(req.body);
    const requestHash = crypto
      .createHash("sha256")
      .update(`POST:/api/transactions/:${payload}`)
      .digest("hex");

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          key,
          request_path: "/api/transactions/",
          request_hash: requestHash,
          status: "COMPLETED",
          response_code: 201,
          response_body: { transaction: { id: "tx-999", amount: 100 } },
        },
      ],
    });

    idempotencyMiddleware(req as Request, res as Response, next as NextFunction);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.setHeader).toHaveBeenCalledWith("Idempotency-Replay", "true");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ transaction: { id: "tx-999", amount: 100 } });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 422 Unprocessable Entity if payload changed for same key", async () => {
    const key = "idem-key-tampered";
    (req.header as jest.Mock).mockReturnValue(key);

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          key,
          request_path: "/api/transactions/",
          request_hash: "different-sha256-hash",
          status: "COMPLETED",
        },
      ],
    });

    idempotencyMiddleware(req as Request, res as Response, next as NextFunction);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Unprocessable Entity",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 409 Conflict if request is currently PROCESSING", async () => {
    const key = "idem-key-inflight";
    (req.header as jest.Mock).mockReturnValue(key);

    const payload = JSON.stringify(req.body);
    const requestHash = crypto
      .createHash("sha256")
      .update(`POST:/api/transactions/:${payload}`)
      .digest("hex");

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          key,
          request_path: "/api/transactions/",
          request_hash: requestHash,
          status: "PROCESSING",
        },
      ],
    });

    idempotencyMiddleware(req as Request, res as Response, next as NextFunction);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "2");
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Conflict",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should claim key with PROCESSING status and call next() for new requests", async () => {
    const key = "idem-key-fresh";
    (req.header as jest.Mock).mockReturnValue(key);

    // 1. SELECT returns no rows
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // 2. INSERT into idempotency_keys
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

    idempotencyMiddleware(req as Request, res as Response, next as NextFunction);
    await new Promise((resolve) => setImmediate(resolve));

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO idempotency_keys"),
      expect.any(Array)
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
