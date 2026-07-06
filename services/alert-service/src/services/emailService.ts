import "dotenv/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Alertmessage } from "../types";

// Support both env naming conventions (EMAIL_USER/EMAIL_PASS and the
// EMAIL/EMAIL_PASSWORD pair used in the service .env) so a mismatch can't
// silently disable delivery.
const EMAIL_USER = process.env.EMAIL_USER ?? process.env.EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS ?? process.env.EMAIL_PASSWORD;
const EMAIL_TO = process.env.EMAIL_TO ?? EMAIL_USER;
const EMAIL_FROM = process.env.EMAIL_FROM ?? EMAIL_USER;

const MAX_ATTEMPTS = Number(process.env.EMAIL_MAX_ATTEMPTS ?? 3);
const RETRY_BASE_MS = Number(process.env.EMAIL_RETRY_BASE_MS ?? 500);

let transporter: Transporter | null = null;

function assertConfigured(): void {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "Email not configured: set EMAIL_USER/EMAIL and EMAIL_PASS/EMAIL_PASSWORD"
    );
  }
  if (!EMAIL_TO) {
    throw new Error("Email not configured: no recipient (set EMAIL_TO)");
  }
}

/** Lazily create a single shared transporter (keeps the module import-safe for tests). */
export function getTransporter(): Transporter {
  assertConfigured();
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
  }
  return transporter;
}

/** Verify SMTP credentials/connectivity. Call once on startup to fail fast. */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    console.log("Email transporter verified");
    return true;
  } catch (err) {
    console.error("Email transporter verification failed:", err);
    return false;
  }
}

/** Escape user-controlled fields before interpolating into the HTML email body. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatReasons(reasons: Alertmessage["reasons"]): string {
  const list = Array.isArray(reasons) ? reasons : [reasons];
  return list.filter(Boolean).join(", ") || "unspecified";
}

export function buildSubject(alert: Alertmessage): string {
  const sev = alert.severity ?? "HIGH";
  return `🚨 Fraud Alert [${sev}] — transaction ${alert.transaction_id}`;
}

export function buildHtml(alert: Alertmessage): string {
  const reasons = escapeHtml(formatReasons(alert.reasons));
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#b91c1c">🚨 Fraud Alert</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><strong>Transaction ID</strong></td><td>${escapeHtml(alert.transaction_id)}</td></tr>
        <tr><td><strong>User ID</strong></td><td>${escapeHtml(alert.user_id)}</td></tr>
        <tr><td><strong>Amount</strong></td><td>${escapeHtml(alert.amount)}</td></tr>
        <tr><td><strong>Country</strong></td><td>${escapeHtml(alert.country)}</td></tr>
        <tr><td><strong>Risk Score</strong></td><td>${escapeHtml(alert.risk_score)}</td></tr>
        <tr><td><strong>Severity</strong></td><td>${escapeHtml(alert.severity ?? "HIGH")}</td></tr>
        <tr><td><strong>Reasons</strong></td><td>${reasons}</td></tr>
        <tr><td><strong>Detected At</strong></td><td>${escapeHtml(alert.timestamp ?? new Date().toISOString())}</td></tr>
      </table>
    </div>
  `;
}

export function buildText(alert: Alertmessage): string {
  return [
    "FRAUD ALERT",
    `Transaction ID: ${alert.transaction_id}`,
    `User ID: ${alert.user_id}`,
    `Amount: ${alert.amount}`,
    `Country: ${alert.country}`,
    `Risk Score: ${alert.risk_score}`,
    `Severity: ${alert.severity ?? "HIGH"}`,
    `Reasons: ${formatReasons(alert.reasons)}`,
    `Detected At: ${alert.timestamp ?? new Date().toISOString()}`,
  ].join("\n");
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a fraud alert email with bounded retries and exponential backoff.
 * Returns true on success, false if all attempts fail. Never throws for a
 * transient send failure so the caller can route to a DLQ instead of crashing.
 */
export async function sendFraudEmail(
  alert: Alertmessage,
  opts: { maxAttempts?: number } = {}
): Promise<boolean> {
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const mail = getTransporter();

  const message = {
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: buildSubject(alert),
    text: buildText(alert),
    html: buildHtml(alert),
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mail.sendMail(message);
      console.log(
        `Email sent for transaction ${alert.transaction_id} (attempt ${attempt})`
      );
      return true;
    } catch (err) {
      console.error(
        `Email attempt ${attempt}/${maxAttempts} failed for transaction ${alert.transaction_id}:`,
        err
      );
      if (attempt < maxAttempts) {
        await sleep(RETRY_BASE_MS * attempt);
      }
    }
  }

  console.error(
    `Giving up on email for transaction ${alert.transaction_id} after ${maxAttempts} attempts`
  );
  return false;
}
