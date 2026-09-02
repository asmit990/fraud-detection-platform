import { sendFraudEmail } from "./emailService";
import { Alertmessage } from "../types";

/** Narrow an unknown parsed value to a well-formed Alertmessage. */
export function parseAlert(raw: string): Alertmessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("alertHandler: message is not valid JSON:", raw);
    return null;
  }

  if (typeof data !== "object" || data === null) {
    console.error("alertHandler: message is not an object:", raw);
    return null;
  }

  const alert = data as Partial<Alertmessage>;
  if (!alert.transaction_id || !alert.user_id) {
    console.error(
      "alertHandler: missing required fields (transaction_id/user_id):",
      raw
    );
    return null;
  }

  return alert as Alertmessage;
}

export async function alertHandler(raw: string): Promise<void> {
  const alert = parseAlert(raw);
  if (!alert) return;

  console.log(
    `Alert received for user ${alert.user_id} (txn ${alert.transaction_id})`
  );

  const delivered = await sendFraudEmail(alert);
  if (!delivered) {
    // Delivery exhausted its retries — flag loudly so it can be picked up by a
    // DLQ / manual replay rather than silently lost.
    console.error(
      `ALERT UNDELIVERED for transaction ${alert.transaction_id} — needs manual follow-up`
    );
  }
}
