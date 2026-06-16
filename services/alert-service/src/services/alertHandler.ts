import { sendFraudEmail } from "./emailService";
import { Alertmessage } from "../types";

export async function alertHandler(raw: string): Promise<void> {
  try {
    const alert: Alertmessage = JSON.parse(raw);

    console.log(`Alert received for user ${alert.user_id}`);

    await sendFraudEmail(alert);
  } catch (error) {
    console.error("alertHandler error:", error);
  }
}