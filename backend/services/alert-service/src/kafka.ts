import "dotenv/config"
import { Kafka, Consumer} from "kafkajs";

const kafka = new Kafka({
    clientId: "alertservice",
  brokers: [process.env.KAFKA_BROKER!],
  retry: {
    initialRetryTime: 300,
    retries: 6
  }
});


const consumer: Consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID ?? "alert-group"
})



export const connectConsumer = async (): Promise<void> => {
    await consumer.connect();
    await consumer.subscribe({
        topic: process.env.KAFKA_TOPIC ?? "alert",
        fromBeginning: true,
    })
    console.log("Kafka consumer connected")
}

export const startConsumer = async (
    handler: (transaction: string) => Promise<void>

): Promise<void> => {
    await consumer.run({
        eachMessage: async({message}) => {
            const value = message.value?.toString();
            if(value) await handler(value);
        },
    });
};

export default kafka;