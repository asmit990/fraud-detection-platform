import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import pool from "../db";


export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const idempotencyKey = req.header("Idempotency-Key") || req.header("idempotency-key");


  if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    return next();
  }

  const trimmedKey = idempotencyKey.trim();
  const requestPath = req.baseUrl + req.path;
  const userId = req.body?.user_id || req.user?.id || "anonymous";


  const requestPayload = req.body ? JSON.stringify(req.body) : "";
  const requestHash = crypto
    .createHash("sha256")
    .update(`${req.method}:${requestPath}:${requestPayload}`)
    .digest("hex");

  (async () => {
    try {

      const existingResult = await pool.query(
        `SELECT * FROM idempotency_keys 
         WHERE key = $1 AND expires_at > NOW()`,
        [trimmedKey]
      );

      if (existingResult.rowCount && existingResult.rowCount > 0) {
        const record = existingResult.rows[0];


        if (record.request_hash !== requestHash || record.request_path !== requestPath) {
          res.status(422).json({
            error: "Unprocessable Entity",
            message: "Idempotency key was previously used with a different request payload or endpoint.",
          });
          return;
        }


        if (record.status === "PROCESSING") {
          res.setHeader("Retry-After", "2");
          res.status(409).json({
            error: "Conflict",
            message: "A request with this idempotency key is currently in progress. Please retry shortly.",
          });
          return;
        }


        if (record.status === "COMPLETED") {
          res.setHeader("Idempotency-Replay", "true");
          res.status(record.response_code || 200).json(record.response_body);
          return;
        }
      }


      try {
        await pool.query(
          `INSERT INTO idempotency_keys (key, user_id, request_path, request_hash, status)
           VALUES ($1, $2, $3, $4, 'PROCESSING')
           ON CONFLICT (key) DO UPDATE
           SET status = 'PROCESSING', 
               request_hash = $4, 
               request_path = $3, 
               user_id = $2, 
               created_at = NOW(), 
               expires_at = NOW() + INTERVAL '24 HOURS'
           WHERE idempotency_keys.expires_at <= NOW()`,
          [trimmedKey, userId, requestPath, requestHash]
        );
      } catch (insertErr: any) {

        if (insertErr.code === "23505") {
          res.setHeader("Retry-After", "2");
          res.status(409).json({
            error: "Conflict",
            message: "A request with this idempotency key is currently in progress. Please retry shortly.",
          });
          return;
        }
        throw insertErr;
      }


      const originalJson = res.json.bind(res);

      res.json = function (body: any) {
        const statusCode = res.statusCode || 200;
        const finalStatus = statusCode < 500 ? "COMPLETED" : "FAILED";


        pool.query(
          `UPDATE idempotency_keys
           SET status = $1, response_code = $2, response_body = $3
           WHERE key = $4`,
          [finalStatus, statusCode, JSON.stringify(body), trimmedKey]
        ).catch((err) => {
          console.error("Failed to update idempotency key cache:", err);
        });

        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Idempotency middleware error:", err);
      next(err);
    }
  })();
}
