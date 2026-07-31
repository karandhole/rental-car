import express from "express";
import { validateCoupon,getActiveCoupons, } from "../controllers/userCoupon.controller.js";

const router = express.Router();

router.get("/active", getActiveCoupons);

router.post("/validate", validateCoupon);

export default router;
