import {Kafka, Consumer} from "kafkajs"
import  "dotenv/config"


const kafka  = new Kafka({
    clientId: "fraud-service",
    brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
})


const consumer: Consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID ?? "fraud-service",
});


export const connectConsumer = async (): Promise<void> => {
  await consumer.connect();
  await consumer.subscribe({
    topic: process.env.KAFKA_TOPIC ?? "transactions",
    fromBeginning: false,
  });
  console.log("Kafka consumer connected");
};


export const startConsuming = async (
  handler: (transaction: string) => Promise<void>
): Promise<void> => {
  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (value) await handler(value);
    },
  });
};