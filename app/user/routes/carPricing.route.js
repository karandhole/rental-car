import express from "express";
import {
  createPricing,
  getPricingByCar
} from "../controllers/carPricing.controller.js";

const router = express.Router();

router.post("/", createPricing);
router.get("/car/:carId", getPricingByCar);

export default router;