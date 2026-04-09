import express from "express";
import { validateCoupon } from "../controllers/userCoupon.controller.js";

const router = express.Router();

router.post("/validate", validateCoupon);

export default router;
