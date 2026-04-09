import prisma from "../../../lib/db.config.js";
import { streamInvoicePdfForPaymentRecord } from "../../utils/sendInvoicePdf.js";

function paymentToInvoiceNo(id) {
  return `INV-${String(id).slice(-8).toUpperCase()}`;
}

function mapPaymentStatusToInvoice(status) {
  switch (status) {
    case "SUCCESS":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Unpaid";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

// ─── Download invoice PDF (gst=0 none; gst=18 → GST 18% on subtotal, total = subtotal + GST) ─
export const downloadInvoicePdf = async (req, res) => {
  try {
    const gstRaw = String(req.query.gst ?? "0");
    const gstPercent = gstRaw === "18" ? 18 : 0;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
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

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    streamInvoicePdfForPaymentRecord(payment, res, gstPercent);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: "Error generating invoice", error: error.message });
    }
  }
};

// ─── List All Payments ────────────────────────────────────────────────────────
export const listPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phoneNum: true } },
          booking: {
            include: {
              car: { select: { id: true, name: true, thumbnail: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      ...p,
      invoiceNo: paymentToInvoiceNo(p.id),
      invoiceStatusLabel: mapPaymentStatusToInvoice(p.status),
    }));

    res.status(200).json({ total, count: data.length, data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments", error: error.message });
  }
};

// ─── Get Single Payment ───────────────────────────────────────────────────────
export const getPayment = async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phoneNum: true, email: true, address: true } },
        booking: {
          include: {
            car: { select: { id: true, name: true, brand: true, thumbnail: true } },
            pricing: true,
          },
        },
      },
    });

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    const payload = {
      ...payment,
      invoiceNo: paymentToInvoiceNo(payment.id),
      invoiceStatusLabel: mapPaymentStatusToInvoice(payment.status),
    };
    res.status(200).json({ data: payload });
  } catch (error) {
    res.status(500).json({ message: "Error fetching payment", error: error.message });
  }
};

// ─── Update Payment Status (admin override) ───────────────────────────────────
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.status(200).json({ message: "Payment status updated", data: payment });
  } catch (error) {
    res.status(500).json({ message: "Error updating payment", error: error.message });
  }
};
