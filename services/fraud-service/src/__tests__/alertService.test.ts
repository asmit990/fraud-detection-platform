jest.mock("../db", () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock("../kafka", () => ({
  __esModule: true,
  publishAlert: jest.fn(),
  ALERT_TOPIC: "alert",
}));

import { buildAlertPayload } from "../services/alertService";
import { Transaction } from "../types";

const tx: Transaction = {
  id: "txn-77",
  user_id: "user-77",
  amount: 12500,
  currency: "INR",
  country: "RU",
  device_id: "dev-1",
  timestamp: "2026-07-06T00:00:00.000Z",
  risk_score: 0,
  fraud_status: "PENDING",
  created_at: "2026-07-06T00:00:00.000Z",
};

describe("buildAlertPayload", () => {
  it("maps a transaction + reasons + score into the alert contract", () => {
    const payload = buildAlertPayload(tx, ["large amount", "geo anomaly"], 88);

    expect(payload).toMatchObject({
      transaction_id: "txn-77",
      user_id: "user-77",
      amount: 12500,
      country: "RU",
      risk_score: 88,
      reasons: ["large amount", "geo anomaly"],
      severity: "HIGH",
    });
    expect(typeof payload.timestamp).toBe("string");
  });

  it("coerces a string/decimal amount to a number", () => {
    const payload = buildAlertPayload(
      { ...tx, amount: "999.50" as unknown as number },
      [],
      50
    );
    expect(payload.amount).toBe(999.5);
    expect(typeof payload.amount).toBe("number");
  });

  it("produces a payload whose keys match what the email service reads", () => {
    const payload = buildAlertPayload(tx, ["velocity fraud"], 70);
    expect(Object.keys(payload).sort()).toEqual(
      [
        "amount",
        "country",
        "reasons",
        "risk_score",
        "severity",
        "timestamp",
        "transaction_id",
        "user_id",
      ].sort()
    );
  });
});
