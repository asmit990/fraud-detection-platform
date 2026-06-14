import "dotenv/config"

import {Kafka, Consumer} from "kafkajs"



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