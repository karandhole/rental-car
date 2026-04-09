import express from "express";
import {
  createSeasonalPricing,
  listSeasonalPricing,
  getSeasonalPricing,
  updateSeasonalPricing,
  deleteSeasonalPricing,
} from "../controllers/seasonalPricing.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, listSeasonalPricing);
router.get("/:id", authMiddleware, getSeasonalPricing);
router.post("/", authMiddleware, createSeasonalPricing);
router.put("/:id", authMiddleware, updateSeasonalPricing);
router.delete("/:id", authMiddleware, deleteSeasonalPricing);

export default router;
