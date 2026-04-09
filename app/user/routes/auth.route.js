import express from "express";
import { requestOTP, verifyOTP } from "../controllers/auth.controller.js";
import { otpLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

router.post("/request-otp", otpLimiter, requestOTP);
router.post("/verify-otp", verifyOTP);

export {router};
