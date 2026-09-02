import { callGemini } from "../services/geminiService";
import { Transaction } from "../types";

const originalFetch = global.fetch;

describe("Gemini Service (AI Fraud Scoring & Resiliency)", () => {
  const mockTx: Transaction = {
    id: "tx-ai-1",
    user_id: "user-ai",
    amount: 50000,
    currency: "INR",
    country: "Russia",
    device_id: "unknown-dev",
    timestamp: "2026-09-01T03:00:00Z",
    risk_score: 0,
    fraud_status: "PENDING",
    created_at: "2026-09-01T03:00:00Z",
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-valid-api-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should return parsed fraud probability and reason on successful API response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    fraud_probability: 0.88,
                    reason: "High value international transaction at unusual hour",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const result = await callGemini(mockTx);
    expect(result.fraud_probability).toBe(0.88);
    expect(result.reason).toBe("High value international transaction at unusual hour");
  });

  it("should fallback gracefully when GEMINI_API_KEY is missing or default", async () => {
    process.env.GEMINI_API_KEY = "";

    const result = await callGemini(mockTx);
    expect(result.fraud_probability).toBe(0);
    expect(result.reason).toContain("API key missing");
  });

  it("should fallback with 0.5 probability when API returns 429 rate limit or 500 error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const result = await callGemini(mockTx);
    expect(result.fraud_probability).toBe(0.5);
    expect(result.reason).toContain("rate limited or unavailable");
  });

  it("should handle timeout gracefully and return fallback", async () => {
    const abortErr = new Error("Request aborted");
    abortErr.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValueOnce(abortErr);

    const result = await callGemini(mockTx);
    expect(result.fraud_probability).toBe(0.5);
    expect(result.reason).toContain("ML timed out");
  });
});
