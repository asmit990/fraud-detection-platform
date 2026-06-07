import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  getTransactionById,
} from "../controller/transaction.controller";

const router = Router();

router.get("/", getTransactions);
router.post("/", createTransaction);
router.get("/:id", getTransactionById);

export default router;
