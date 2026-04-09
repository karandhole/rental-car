import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentByBooking,
  getPaymentsByUser,
  downloadInvoiceByBooking,
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/booking/:bookingId/invoice", authMiddleware, downloadInvoiceByBooking);
router.get("/by-booking/:bookingId", getPaymentByBooking);
router.get("/by-user/:userId", getPaymentsByUser);

export default router;