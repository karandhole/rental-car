import express from "express";
import {
  listPayments,
  getPayment,
  updatePaymentStatus,
  downloadInvoicePdf,
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, listPayments);
router.get("/:id/invoice", authMiddleware, downloadInvoicePdf);
router.get("/:id", authMiddleware, getPayment);
router.patch("/:id/status", authMiddleware, updatePaymentStatus);

export default router;
