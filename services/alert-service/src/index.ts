import "dotenv/config"
import { connectConsumer, startConsumer } from "./kafka";
import { alertHandler } from "./services/alertHandler";



async function start(): Promise<void> {
  try {
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