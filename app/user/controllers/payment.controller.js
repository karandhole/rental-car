import razorpay from "../../../lib/razorpay.js";
import crypto from "crypto";
import prisma from "../../../lib/db.config.js";
import { streamInvoicePdfForPaymentRecord } from "../../utils/sendInvoicePdf.js";

// ─── 1. Create Razorpay Order ────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: Math.round(amount * 100), // convert to paisa
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 2. Verify Payment & Save to DB ─────────────────────────────────────────
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
    userId,
    amount,
  } = req.body;

  // HMAC signature check
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const isValid = expectedSignature === razorpay_signature;

  try {
    if (isValid) {
      // Save Payment record
      const payment = await prisma.payment.create({
        data: {
          bookingId,
          userId,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          amount: amount || 0,
          currency: "INR",
          status: "SUCCESS",
        },
      });

      // Update Booking status → CONFIRMED and store paymentId
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        },
      });

      return res.status(200).json({ success: true, payment });
    } else {
      // Save failed payment record (only if bookingId present)
      if (bookingId && userId) {
        await prisma.payment.create({
          data: {
            bookingId,
            userId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id || null,
            razorpaySignature: razorpay_signature || null,
            amount: amount || 0,
            currency: "INR",
            status: "FAILED",
          },
        });
      }
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("verifyPayment DB error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── 3. Get Payment by Booking ID ────────────────────────────────────────────
export const getPaymentByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
    });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.json(payment);
  } catch (error) {
    console.error("getPaymentByBooking error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 4. Get All Payments by User ─────────────────────────────────────────────
export const getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        booking: {
          include: {
            car: { select: { name: true, images: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (error) {
    console.error("getPaymentsByUser error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Download invoice PDF for own booking (same PDF as admin) ─────────────────
export const downloadInvoiceByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const gstRaw = String(req.query.gst ?? "0");
    const gstPercent = gstRaw === "18" ? 18 : 0;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
    });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      include: {
        user: true,
        booking: {
          include: {
            car: true,
            pricing: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Invoice not available yet" });
    }

    if (payment.status !== "SUCCESS") {
      return res.status(400).json({ message: "Invoice is available after successful payment" });
    }

    streamInvoicePdfForPaymentRecord(payment, res, gstPercent);
  } catch (error) {
    console.error("downloadInvoiceByBooking error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error generating invoice", error: error.message });
    }
  }
};