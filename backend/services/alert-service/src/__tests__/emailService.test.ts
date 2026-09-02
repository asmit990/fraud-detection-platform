// Set email config BEFORE importing the module (env is read at import time).
process.env.EMAIL_USER = "sender@example.com";
process.env.EMAIL_PASS = "app-password";
process.env.EMAIL_TO = "soc@example.com";
process.env.EMAIL_RETRY_BASE_MS = "0"; // no real delay in tests

const sendMail = jest.fn();
const verify = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail, verify })),
}));

import {
  sendFraudEmail,
  verifyEmailConnection,
  buildHtml,
  buildText,
  buildSubject,
  escapeHtml,
} from "../services/emailService";
import { Alertmessage } from "../types";

const baseAlert: Alertmessage = {
  transaction_id: "txn-1",
  user_id: "user-1",
  amount: 4200,
  country: "NG",
  risk_score: 87,
  reasons: ["large amount", "geo anomaly"],
  severity: "HIGH",
  timestamp: "2026-07-06T00:00:00.000Z",
};

beforeEach(() => {
  sendMail.mockReset();
  verify.mockReset();
});

describe("sendFraudEmail", () => {
  it("sends an email and returns true on success", async () => {
    sendMail.mockResolvedValueOnce({ messageId: "1" });

    const ok = await sendFraudEmail(baseAlert);

    expect(ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const msg = sendMail.mock.calls[0][0];
    expect(msg.to).toBe("soc@example.com");
    expect(msg.from).toBe("sender@example.com");
    expect(msg.subject).toContain("txn-1");
    expect(msg.text).toContain("user-1");
    expect(msg.html).toContain("Fraud Alert");
  });

  it("retries and eventually succeeds", async () => {
    sendMail
      .mockRejectedValueOnce(new Error("smtp timeout"))
      .mockResolvedValueOnce({ messageId: "2" });

    const ok = await sendFraudEmail(baseAlert, { maxAttempts: 3 });

    expect(ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("returns false (without throwing) after exhausting retries", async () => {
    sendMail.mockRejectedValue(new Error("smtp down"));

    const ok = await sendFraudEmail(baseAlert, { maxAttempts: 2 });

    expect(ok).toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("handles reasons provided as a plain string", async () => {
    sendMail.mockResolvedValueOnce({ messageId: "3" });

    const ok = await sendFraudEmail({ ...baseAlert, reasons: "velocity fraud" });

    expect(ok).toBe(true);
    expect(sendMail.mock.calls[0][0].text).toContain("velocity fraud");
  });
});

describe("verifyEmailConnection", () => {
  it("returns true when verify resolves", async () => {
    verify.mockResolvedValueOnce(true);
    expect(await verifyEmailConnection()).toBe(true);
  });

  it("returns false when verify rejects", async () => {
    verify.mockRejectedValueOnce(new Error("bad creds"));
    expect(await verifyEmailConnection()).toBe(false);
  });
});

describe("template builders", () => {
  it("escapes HTML in user-controlled fields (injection guard)", () => {
    const html = buildHtml({
      ...baseAlert,
      country: '<script>alert(1)</script>',
      user_id: 'a"b',
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
  });

  it("escapeHtml handles all special characters", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("plaintext body includes the key alert fields", () => {
    const text = buildText(baseAlert);
    expect(text).toContain("txn-1");
    expect(text).toContain("87");
    expect(text).toContain("large amount, geo anomaly");
  });

  it("subject reflects severity", () => {
    expect(buildSubject(baseAlert)).toContain("HIGH");
  });
});
