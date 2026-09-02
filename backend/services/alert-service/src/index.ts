import "dotenv/config"
import { connectConsumer, startConsumer } from "./kafka";
import { alertHandler } from "./services/alertHandler";
import { verifyEmailConnection } from "./services/emailService";



async function start(): Promise<void> {
  try {
    const emailOk = await verifyEmailConnection();
    if (!emailOk) {
      console.warn(
        "Email transporter not verified — alerts may fail to send. Check EMAIL_USER/EMAIL_PASS."
      );
    }

    await connectConsumer();
    console.log("Kafka connected");

    await startConsumer(alertHandler);
    console.log("Alert service running...");
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

start();
