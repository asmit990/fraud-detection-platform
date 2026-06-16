import { Router } from "express";
import {
  getSummary,
  getTrends,
  getCountries,
} from "../controllers/analytics.controller";

const router = Router();

router.get("/summary", getSummary);
router.get("/trends", getTrends);
router.get("/countries", getCountries);

export default router;
