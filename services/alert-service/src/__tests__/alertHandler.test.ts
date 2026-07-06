const sendFraudEmail = jest.fn();

jest.mock("../services/emailService", () => ({
  sendFraudEmail: (...args: unknown[]) => sendFraudEmail(...args),
}));

import { alertHandler, parseAlert } from "../services/alertHandler";

const validRaw = JSON.stringify({
  transaction_id: "txn-9",
  user_id: "user-9",
  amount: 999,
  country: "US",
  risk_score: 72,
  reasons: ["velocity fraud"],
});

beforeEach(() => {
  sendFraudEmail.mockReset();
});

describe("parseAlert", () => {
  it("parses a well-formed alert", () => {
    const alert = parseAlert(validRaw);
    expect(alert?.transaction_id).toBe("txn-9");
  });

  it("returns null for invalid JSON", () => {
    expect(parseAlert("{not json")).toBeNull();
  });

  it("returns null for a JSON non-object", () => {
    expect(parseAlert("42")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseAlert(JSON.stringify({ amount: 5 }))).toBeNull();
  });
});

describe("alertHandler", () => {
  it("sends an email for a valid alert", async () => {
    sendFraudEmail.mockResolvedValueOnce(true);
    await alertHandler(validRaw);
    expect(sendFraudEmail).toHaveBeenCalledTimes(1);
    expect(sendFraudEmail.mock.calls[0][0].transaction_id).toBe("txn-9");
  });

  it("does not send for an invalid message", async () => {
    await alertHandler("{broken");
    expect(sendFraudEmail).not.toHaveBeenCalled();
  });

  it("does not throw when delivery ultimately fails", async () => {
    sendFraudEmail.mockResolvedValueOnce(false);
    await expect(alertHandler(validRaw)).resolves.toBeUndefined();
  });
});
