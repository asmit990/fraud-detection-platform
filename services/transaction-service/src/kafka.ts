import { Kafka, Partitioners } from "kafkajs"  

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? "transaction-service",
  brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
});


const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

export async function connectProducer() {
    await producer.connect()
}


export async function publishMessage(topic: string, message: any) {
     await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(message),
      },
    ],
  });
}




export default producer;