import express from "express";
import { createCarPartner, carPartnerLogin, forgotPassword, resetPassword, resendOtp, verifyOtp } from "../controllers/auth.controller.js";
import { authMiddleware } from "../../admin/middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register",authMiddleware ,createCarPartner);
router.post("/login", carPartnerLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/reset-password", resetPassword);

export default router;