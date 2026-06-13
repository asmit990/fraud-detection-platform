import "dotenv/config"
import express from "express";
import pool from "./db"
import { connectConsumer } from "./kafka"

const app = express()

app.use(express.json())


const PORT = process.env.PORT ?? 3002


app.get("/health", (_req, res) => {
  res.json({ status: "ok hai darling" });
});



async function start() {
    try {
        await pool.connect() 

        console.log("Postgres connected")

        await connectConsumer()
        console.log("Kafka consumer connected")
       
        app.listen(PORT, () => {
            console.log(`Fraud service running on port ${PORT}`);
        })

    } catch (error) {
        console.error("Error connecting to Postgres:", error)
    }
}


start()