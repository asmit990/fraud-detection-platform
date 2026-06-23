import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  getAlerts,
} from "../controller/transaction.controller";

const router = Router();

router.get("/", getTransactions);
router.post("/", createTransaction);
router.get("/alerts", getAlerts);
router.get("/:id", getTransactionById);

export default router;
