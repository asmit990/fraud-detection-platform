import pool from "./db";
import { publishMessage } from "./kafka"




const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;



export function startOutboxRelay(): void {

    setInterval(async () => {
        const client = await pool.connect();


        try {
            await client.query("BEGIN")


            const { rows } = await client.query(
                `SELECT * FROM outbox_events
                WHERE published_at IS NULL
                ORDER BY created_at
                LIMIT $1
                FOR UPDATE SKIP LOCKED`,
                [BATCH_SIZE]
            )

            for (const event of rows) {
                await publishMessage(
                    process.env.KAFKA_TOPIC ?? "transaction",
                    event.payload

                )
                await client.query(
                    `UPDATE outbox_events SET published_at = NOW() WHERE id = $1`,
                    [event.id]
                );



            }
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Outbox relay error:", err);
        } finally {
            client.release();
        }
    }, POLL_INTERVAL_MS)
}