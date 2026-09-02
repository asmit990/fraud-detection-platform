import "dotenv/config"

import { Kafka, Consumer, Producer } from "kafkajs"
import { DlqEnvelope } from "./types";


const kafka = new Kafka({
  clientId: "fraud-service",
  brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
})

export const DLQ_TOPIC = process.env.KAFKA_DLQ_TOPIC ?? "transaction.dlq";

export const publishToDlq = async (
  rawPayload: string | null,
  error: Error,
  retryCount: number,
  key?: string
): Promise<void> => {
  const envelope: DlqEnvelope = {
    original_payload: rawPayload,
    error_message: error.message,
    error_stack: error.stack,
    retry_count: retryCount,
    service: "fraud-services",
    failed_at: new Date().toISOString(),
  };


  await producer.send({
    topic: DLQ_TOPIC,
    messages: [
      {
        key: key ?? "unknown",
        value: JSON.stringify(envelope),
      },
    ],
  });
  console.error(`[DLQ] Message Forwarded to  ${DLQ_TOPIC}:`, error.message)
}


const consumer: Consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID ?? "fraud-service-group",
});

const producer: Producer = kafka.producer();


export const ALERT_TOPIC = process.env.KAFKA_ALERT_TOPIC ?? "alert";

export const connectProducer = async (): Promise<void> => {
  await producer.connect();
  console.log("Kafka producer connected");
};

export const disconnectProducer = async (): Promise<void> => {
  await producer.disconnect();
};

export const publishAlert = async (payload: {
  transaction_id: string;
}): Promise<void> => {
  await producer.send({
    topic: ALERT_TOPIC,
    messages: [
      { key: payload.transaction_id, value: JSON.stringify(payload) },
    ],
  });
};


export const connectConsumer = async (): Promise<void> => {
  await consumer.connect();
  await consumer.subscribe({
    topic: process.env.KAFKA_TOPIC ?? "transactions",
    fromBeginning: true,
  });
  console.log("Kafka consumer connected");
};


const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


export const startConsumer = async (
  handler: (transaction: string) => Promise<void>
): Promise<void> => {
  await consumer.run({
    eachMessage: async ({ message }) => {
      const rawValue = message.value?.toString() ?? null;
      const messageKey = message.key?.toString();


      if (!rawValue) return;


      let attempt = 0;
      let lastError: Error = new Error("Unknown Error")


      while (attempt < MAX_RETRIES) {
        attempt++;
        try {
          await handler(rawValue);
          return;
        } catch (err: any) {
          lastError = err;
          console.warn(`[Retry] ${attempt}/${MAX_RETRIES}] failed to process messages: `, err.message);


          if (attempt < MAX_RETRIES) {
            await sleep(attempt * 200);
          }
        }
      }


      await publishToDlq(rawValue, lastError, attempt, messageKey);
    },
  });
};





