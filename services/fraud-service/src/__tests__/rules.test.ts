import largeAmountRule from "../rules/largeAmount";
import velocityRule from "../rules/velocity";
import geoAnomalyRule from "../rules/geoAnomaly";
import deviceAnomalyRule from "../rules/deviceAnomaly";
import { nightActivityRule } from "../rules/nightActivity";
import { ipReputation } from "../rules/ipReputation";
import { multipleFailedAttemptsRule, recordFailedAttempt, resetFailedAttempts } from "../rules/multipleFailedAttempts";
import { unusualMerchantRule } from "../rules/unusualMerchant";
import redis from "../redis";
import { Transaction } from "../types";

jest.mock("../redis", () => ({
  __esModule: true,
  default: {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    sadd: jest.fn(),
    scard: jest.fn(),
  },
}));

describe("Deterministic Fraud Rules Suite (8 Rules)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseTx: Transaction = {
    id: "tx-123",
    user_id: "user-1",
    amount: 500,
    currency: "INR",
    country: "India",
    device_id: "device-1",
    timestamp: "2026-09-01T12:00:00Z",
    risk_score: 0,
    fraud_status: "PENDING",
    created_at: "2026-09-01T12:00:00Z",
  };

  describe("Rule 1: largeAmountRule", () => {
    it("should return +40 if amount > 10,000", async () => {
      const score = await largeAmountRule({ ...baseTx, amount: 15000 });
      expect(score).toBe(40);
    });

    it("should return 0 if amount <= 10,000", async () => {
      const score = await largeAmountRule({ ...baseTx, amount: 9999 });
      expect(score).toBe(0);
    });
  });

  describe("Rule 2: velocityRule", () => {
    it("should return +30 if count > 5 in 10 minutes", async () => {
      (redis.incr as jest.Mock).mockResolvedValueOnce(6);
      const score = await velocityRule("user-1");
      expect(score).toBe(30);
    });

    it("should set 600s TTL on first transaction and return 0", async () => {
      (redis.incr as jest.Mock).mockResolvedValueOnce(1);
      const score = await velocityRule("user-1");
      expect(redis.expire).toHaveBeenCalledWith("velocity:user-1", 600);
      expect(score).toBe(0);
    });
  });

  describe("Rule 3: geoAnomalyRule", () => {
    it("should return +30 if country differs from previous country", async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce("India");
      const score = await geoAnomalyRule("user-1", "Russia");
      expect(redis.set).toHaveBeenCalledWith("geo:user-1", "Russia");
      expect(score).toBe(30);
    });

    it("should return 0 if country is the same or first time seen", async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      const score = await geoAnomalyRule("user-1", "India");
      expect(score).toBe(0);
    });
  });

  describe("Rule 4: deviceAnomalyRule", () => {
    it("should return +25 if new device is seen for an existing user", async () => {
      (redis.smembers as jest.Mock).mockResolvedValueOnce(["old-device:undefined:undefined"]);
      (redis.sismember as jest.Mock).mockResolvedValueOnce(0);
      const score = await deviceAnomalyRule("user-1", "new-device");
      expect(redis.sadd).toHaveBeenCalled();
      expect(score).toBe(25);
    });

    it("should return 0 for first device seen for new user", async () => {
      (redis.smembers as jest.Mock).mockResolvedValueOnce([]);
      (redis.sismember as jest.Mock).mockResolvedValueOnce(0);
      const score = await deviceAnomalyRule("user-1", "first-device");
      expect(score).toBe(0);
    });
  });

  describe("Rule 5: nightActivityRule", () => {
    it("should return +20 if transaction occurs between 1 AM and 5 AM", () => {
      const nightTx = { ...baseTx, timestamp: "2026-09-01T03:30:00" };
      const score = nightActivityRule(nightTx);
      expect(score).toBe(20);
    });

    it("should return 0 for daytime transactions", () => {
      const dayTx = { ...baseTx, timestamp: "2026-09-01T14:30:00" };
      const score = nightActivityRule(dayTx);
      expect(score).toBe(0);
    });
  });

  describe("Rule 6: ipReputation", () => {
    it("should return +35 if IP is hardcoded blacklisted", async () => {
      const score = await ipReputation("192.168.1.100");
      expect(score).toBe(35);
    });

    it("should return +35 if > 10 distinct users share the same IP", async () => {
      (redis.incr as jest.Mock).mockResolvedValueOnce(15);
      const score = await ipReputation("203.0.113.45");
      expect(score).toBe(35);
    });

    it("should return 0 for normal clean IP", async () => {
      (redis.incr as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      const score = await ipReputation("203.0.113.1");
      expect(score).toBe(0);
    });
  });

  describe("Rule 7: multipleFailedAttemptsRule", () => {
    it("should return +30 if user has >= 5 failed attempts", async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce("5");
      const score = await multipleFailedAttemptsRule("user-1");
      expect(score).toBe(30);
    });

    it("should return +15 if user has between 3 and 4 failed attempts", async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce("3");
      const score = await multipleFailedAttemptsRule("user-1");
      expect(score).toBe(15);
    });

    it("should record failed attempt and set TTL", async () => {
      (redis.incr as jest.Mock).mockResolvedValueOnce(1);
      await recordFailedAttempt("user-1");
      expect(redis.expire).toHaveBeenCalledWith("failed:user-1", 3600);
    });

    it("should reset failed attempts", async () => {
      await resetFailedAttempts("user-1");
      expect(redis.del).toHaveBeenCalledWith("failed:user-1");
    });
  });

  describe("Rule 8: unusualMerchantRule", () => {
    it("should return +25 for high risk merchant categories", async () => {
      const score = await unusualMerchantRule("user-1", "crypto");
      expect(score).toBe(25);
    });

    it("should return +15 if category is new for an established user", async () => {
      (redis.sismember as jest.Mock).mockResolvedValueOnce(0);
      (redis.scard as jest.Mock).mockResolvedValueOnce(3);
      const score = await unusualMerchantRule("user-1", "electronics");
      expect(score).toBe(15);
    });

    it("should return 0 for user's very first merchant category", async () => {
      (redis.sismember as jest.Mock).mockResolvedValueOnce(0);
      (redis.scard as jest.Mock).mockResolvedValueOnce(1);
      const score = await unusualMerchantRule("user-1", "grocery");
      expect(score).toBe(0);
    });
  });
});
