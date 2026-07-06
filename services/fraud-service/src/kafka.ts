import "dotenv/config"

import {Kafka, Consumer, Producer} from "kafkajs"



const kafka  = new Kafka({
    clientId: "fraud-service",
    brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
    retry: {
    initialRetryTime: 300,
    retries: 10
  }
})


const consumer: Consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID ?? "fraud-service-group",
});

const producer: Producer = kafka.producer();

// Topic that carries fraud alerts to the alert/email service.
export const ALERT_TOPIC = process.env.KAFKA_ALERT_TOPIC ?? "alert";

export const connectProducer = async (): Promise<void> => {
  await producer.connect();
  console.log("Kafka producer connected");
};

export const disconnectProducer = async (): Promise<void> => {
  await producer.disconnect();
};

/**
 * Publish a fraud alert to Kafka. Keyed by transaction_id so all events for a
 * transaction land on the same partition and stay ordered.
 */
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


export const startConsumer = async (
  handler: (transaction: string) => Promise<void>
): Promise<void> => {
  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (value) await handler(value);
    },
  });
};