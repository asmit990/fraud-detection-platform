import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  getAlerts,
} from "../controller/transaction.controller";
import { idempotencyMiddleware } from "../middleware/idempotencyMiddleware";

const router = Router();

router.get("/", getTransactions);
router.post("/", idempotencyMiddleware, createTransaction);
router.get("/alerts", getAlerts);
router.get("/:id", getTransactionById);

export default router;
