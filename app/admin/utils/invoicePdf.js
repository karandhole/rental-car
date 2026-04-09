import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
  dark: "#1A1A2E",
  darkCard: "#222222",
  darkCardLight: "#2E2E3A",
  heading: "#111827",
  body: "#374151",
  muted: "#6B7280",
  light: "#F9FAFB",
  border: "#E5E7EB",
  tableBg: "#F5F5F5",
  amber: "#F5A623",
  amberLight: "#FFF3DC",
  teal: "#127384",
  white: "#FFFFFF",
  black: "#000000",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatMoney(value, currency = "INR") {
  try {
    const currencyDisplay = currency === "INR" ? "code" : "symbol";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

function formatMoneyShort(value, currency = "INR") {
  // PDFKit's built-in fonts don't support the ₹ Unicode glyph (U+20B9),
  // so we use 'Rs.' which renders correctly without embedding extra fonts.
  if (currency === "INR") return `Rs. ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return formatMoney(value, currency);
}

function formatDate(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatAddress(addr) {
  if (!addr || typeof addr !== "object") return "";
  const parts = [
    addr.addressLine,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country,
  ].filter(Boolean);
  return parts.join(", ");
}

// ─── Asset paths ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultLogoPath = path.resolve(
  __dirname,
  "../../..",
  "assest/light-theme-logo-authentication.png"
);
const defaultSignaturePath = path.resolve(
  __dirname,
  "../../..",
  "assest/signature.png"
);

/**
 * Build a professional invoice PDF matching the client's design.
 * @param {import("pdfkit")} doc
 * @param {object} opts
 */
export function buildInvoicePdf(doc, opts) {
  const {
    companyName = "Ekalo Drive",
    companyAddress = "",
    companyPhone = "",
    companyEmail = "",
    companyGstin = "",
    companyLogoPath = "",
    signaturePath = "",
    invoiceNo,
    invoiceDate,
    dueDate,
    gstLabel,
    gstPercent,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    // Car / booking details
    carName = "",
    rentalType = "",
    pickupDateRaw = "",
    returnDateRaw = "",
    deliveryCharge = 0,
    paymentMode = "Razorpay",
    paymentStatus = "",
    // Amounts
    lineDescription,
    lineQty,
    subtotal,
    gstAmount,
    total,
    currency,
    paymentRef,
    transactionId,
  } = opts;

  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const L = doc.page.margins.left;
  const R = L + pageW;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HEADER — Logo on left + "INVOICE" title + invoice number on right
  // ═══════════════════════════════════════════════════════════════════════════
  const hdrTop = 40;

  // Logo on the left
  const logoPath = companyLogoPath || defaultLogoPath;
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, L, hdrTop, { height: 38 });
  } else {
    doc.fontSize(16).fillColor(C.heading).text(companyName, L, hdrTop);
  }

  // INVOICE title on the right
  doc
    .fontSize(22)
    .fillColor(C.heading)
    .text("INVOICE", L, hdrTop, { width: pageW, align: "right" });
  doc
    .fontSize(9)
    .fillColor(C.muted)
    .text(`Invoice Number : ${invoiceNo}`, L, hdrTop + 26, {
      width: pageW,
      align: "right",
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. INFO BLOCK — Billed To | Invoice From | Dates/Amount
  // ═══════════════════════════════════════════════════════════════════════════
  const blockTop = hdrTop + 54;

  // --- Measure content heights first so the block is tall enough ---
  const col1W = pageW * 0.32;
  const col2W = pageW * 0.38;
  const col3W = pageW - col1W - col2W;
  const pad = 14;
  const innerW1 = col1W - pad * 2;
  const innerW2 = col2W - pad * 2;
  const innerW3 = col3W - pad * 2;

  const billedToLines = [
    customerName || "Customer",
    customerEmail,
    customerPhone,
    customerAddress,
  ].filter(Boolean);

  const invoiceFromLines = [
    companyName.toUpperCase(),
    companyGstin ? `GSTIN: ${companyGstin}` : "",
    companyAddress,
    companyEmail,
  ].filter(Boolean);

  const rightColLines = [
    `Issue Date : ${invoiceDate}`,
    `Amount : ${formatMoneyShort(total, currency)}`,
    "",
    paymentRef ? `Order ID : ${paymentRef}` : "",
  ].filter(Boolean);

  // Measure heights
  const measureLines = (lines, w, titleSize, bodySize) => {
    doc.fontSize(titleSize);
    let h = doc.heightOfString("Title", { width: w }) + 8;
    lines.forEach((ln) => {
      if (!ln) return;
      doc.fontSize(bodySize);
      h += doc.heightOfString(String(ln), { width: w }) + 3;
    });
    return h;
  };

  const h1 = measureLines(billedToLines, innerW1, 11, 9);
  const h2 = measureLines(invoiceFromLines, innerW2, 11, 8.5);
  const h3 = measureLines(rightColLines, innerW3, 9, 9);
  const blockH = Math.max(h1, h2, h3) + pad * 2 + 4;

  // Black border around the info block
  doc.roundedRect(L, blockTop, pageW, blockH, 6).lineWidth(1).strokeColor(C.black).stroke();

  // Column 1 — Billed To
  doc.save();
  doc.rect(L, blockTop, col1W, blockH).clip();
  let y1 = blockTop + pad;
  doc.fontSize(11).fillColor(C.heading).text("Billed To", L + pad, y1, { width: innerW1 });
  y1 += doc.heightOfString("Billed To", { width: innerW1 }) + 6;
  billedToLines.forEach((ln) => {
    doc.fontSize(9).fillColor(C.body).text(ln, L + pad, y1, { width: innerW1 });
    y1 += doc.heightOfString(ln, { width: innerW1 }) + 3;
  });
  doc.restore();

  // Vertical separator 1
  const sepX1 = L + col1W;
  doc.moveTo(sepX1, blockTop + 8).lineTo(sepX1, blockTop + blockH - 8).lineWidth(0.5).strokeColor(C.border).stroke();

  // Column 2 — Invoice From
  doc.save();
  doc.rect(sepX1, blockTop, col2W, blockH).clip();
  let y2 = blockTop + pad;
  doc.fontSize(11).fillColor(C.heading).text("Invoice From", sepX1 + pad, y2, { width: innerW2 });
  y2 += doc.heightOfString("Invoice From", { width: innerW2 }) + 6;
  invoiceFromLines.forEach((ln) => {
    doc.fontSize(8.5).fillColor(C.body).text(ln, sepX1 + pad, y2, { width: innerW2 });
    y2 += doc.heightOfString(String(ln), { width: innerW2 }) + 3;
  });
  doc.restore();

  // Vertical separator 2
  const sepX2 = L + col1W + col2W;
  doc.moveTo(sepX2, blockTop + 8).lineTo(sepX2, blockTop + blockH - 8).lineWidth(0.5).strokeColor(C.border).stroke();

  // Column 3 — Issue date / amount / order id (same white background as other columns)
  doc.save();
  doc.rect(sepX2, blockTop, col3W, blockH).clip();
  let y3 = blockTop + pad;
  rightColLines.forEach((ln) => {
    doc.fontSize(9).fillColor(C.heading).text(ln, sepX2 + pad, y3, { width: innerW3 });
    y3 += doc.heightOfString(String(ln), { width: innerW3 }) + 5;
  });
  doc.restore();

  // Subtle bottom divider under the info block
  doc
    .moveTo(L, blockTop + blockH + 6)
    .lineTo(R, blockTop + blockH + 6)
    .lineWidth(0.5)
    .strokeColor(C.border)
    .stroke();

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. RENTAL DETAILS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  const tableTop = blockTop + blockH + 24;

  // Column widths
  const tCols = [
    { label: "Rented Car", w: pageW * 0.20 },
    { label: "Rental Type", w: pageW * 0.16 },
    { label: "Pickup Date", w: pageW * 0.24 },
    { label: "Return Date", w: pageW * 0.24 },
    { label: "Amount", w: pageW * 0.16 },
  ];

  // Header row
  const thH = 28;
  doc.rect(L, tableTop, pageW, thH).fill(C.tableBg);
  doc.rect(L, tableTop, pageW, thH).strokeColor(C.border).stroke();
  let tx = L;
  tCols.forEach((col) => {
    const align = col.label === "Amount" ? "right" : "left";
    const px = col.label === "Amount" ? 12 : 8;
    doc.fontSize(9).fillColor(C.heading).text(col.label, tx + px, tableTop + 9, {
      width: col.w - px * 2,
      align,
    });
    tx += col.w;
  });

  // Data row
  const trH = 32;
  const trTop = tableTop + thH;
  doc.rect(L, trTop, pageW, trH).strokeColor(C.border).stroke();
  const rowData = [
    carName || lineDescription || "Car rental",
    rentalType || "—",
    pickupDateRaw ? formatDateTime(pickupDateRaw) : "—",
    returnDateRaw ? formatDateTime(returnDateRaw) : "—",
    formatMoneyShort(subtotal, currency),
  ];
  tx = L;
  rowData.forEach((val, i) => {
    const align = i === 4 ? "right" : "left";
    const px = i === 4 ? 12 : 8;
    doc.fontSize(9).fillColor(C.body).text(val, tx + px, trTop + 10, {
      width: tCols[i].w - px * 2,
      align,
    });
    tx += tCols[i].w;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PAYMENT DETAILS + AMOUNT BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════════════
  const payTop = trTop + trH + 24;
  const payLeftW = pageW * 0.45;
  const payRightW = pageW * 0.55;

  // --- Left side: Payment Details in dashed box ---
  doc.fontSize(11).fillColor(C.heading).text("Payment Details", L, payTop);
  const dashBoxTop = payTop + 20;
  const dashBoxW = payLeftW - 20;
  const dashBoxH = 58;
  doc.save();
  doc.roundedRect(L, dashBoxTop, dashBoxW, dashBoxH, 4).dash(4, { space: 3 }).strokeColor(C.muted).stroke();
  doc.undash();
  doc.restore();

  const payLines = [
    `Mode: ${paymentMode}`,
    transactionId ? `Payment ID: ${transactionId}` : "",
    paymentStatus ? `Status: ${paymentStatus}` : "",
  ].filter(Boolean);
  let py = dashBoxTop + 10;
  payLines.forEach((ln) => {
    doc.fontSize(8.5).fillColor(C.body).text(ln, L + 12, py, { width: dashBoxW - 24 });
    py += 14;
  });

  // --- Right side: Rental Amount + Delivery Charge ---
  const amtX = L + payLeftW;
  const amtLabelW = payRightW * 0.55;
  const amtValW = payRightW * 0.45;

  const drawAmtRow = (label, value, yPos, bold) => {
    const fs = bold ? 10 : 9;
    const clr = bold ? C.heading : C.body;
    doc.fontSize(fs).fillColor(clr).text(label, amtX, yPos, { width: amtLabelW });
    doc.fontSize(fs).fillColor(clr).text(value, amtX + amtLabelW, yPos, {
      width: amtValW,
      align: "right",
    });
  };

  drawAmtRow("Rental Amount", formatMoneyShort(subtotal, currency), payTop + 4);
  // Divider
  doc.moveTo(amtX, payTop + 22).lineTo(R, payTop + 22).lineWidth(0.5).strokeColor(C.border).stroke();
  drawAmtRow("Delivery Charge", `+ ${formatMoneyShort(deliveryCharge, currency)}`, payTop + 30);

  if (gstPercent > 0) {
    doc.moveTo(amtX, payTop + 48).lineTo(R, payTop + 48).lineWidth(0.5).strokeColor(C.border).stroke();
    drawAmtRow(`GST (${gstPercent}%)`, formatMoneyShort(gstAmount, currency), payTop + 56);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TOTAL BAR (amber highlight)
  // ═══════════════════════════════════════════════════════════════════════════
  const gstExtra = gstPercent > 0 ? 34 : 0;
  const totalBarTop = payTop + 78 + gstExtra;
  const totalBarH = 30;
  doc.rect(L, totalBarTop, pageW, totalBarH).fill(C.amber);
  doc
    .fontSize(12)
    .fillColor(C.white)
    .text("Total", L + 14, totalBarTop + 8, { width: pageW * 0.6 });
  doc
    .fontSize(13)
    .fillColor(C.white)
    .text(formatMoneyShort(total, currency), L, totalBarTop + 8, {
      width: pageW - 14,
      align: "right",
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  const notesTop = totalBarTop + totalBarH + 22;
  doc.fontSize(11).fillColor(C.heading).text("Notes", L, notesTop);
  doc
    .fontSize(9)
    .fillColor(C.body)
    .text(`Thank you for choosing ${companyName.toUpperCase()}!`, L, notesTop + 16);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TERMS & CONDITIONS + SIGNATURE
  // ═══════════════════════════════════════════════════════════════════════════
  const tcTop = notesTop + 42;
  doc.fontSize(11).fillColor(C.heading).text("Terms and Conditions", L, tcTop);
  doc
    .fontSize(9)
    .fillColor(C.body)
    .text(
      `All rentals are subject to ${companyName.toUpperCase()}'s Terms of Service.`,
      L,
      tcTop + 16,
      { width: pageW * 0.55 }
    );

  // Signature on the right
  const sigImgPath = signaturePath || defaultSignaturePath;
  const sigBlockW = 150;
  const sigBlockX = R - sigBlockW;

  if (sigImgPath && fs.existsSync(sigImgPath)) {
    const sigImgH = 50;
    doc.image(sigImgPath, sigBlockX + 10, tcTop - 6, {
      width: sigBlockW - 20,
      height: sigImgH,
    });
    // Line
    doc
      .moveTo(sigBlockX, tcTop + sigImgH - 2)
      .lineTo(sigBlockX + sigBlockW, tcTop + sigImgH - 2)
      .lineWidth(1)
      .strokeColor(C.heading)
      .stroke();
    // Company name
    doc
      .fontSize(10)
      .fillColor(C.heading)
      .text(companyName.toUpperCase(), sigBlockX, tcTop + sigImgH + 4, {
        width: sigBlockW,
        align: "center",
      });
  } else {
    doc
      .fontSize(12)
      .fillColor(C.heading)
      .text(companyName.toUpperCase(), sigBlockX, tcTop + 6, {
        width: sigBlockW,
        align: "center",
      });
  }

  doc.fillColor(C.black);
}

export function createInvoicePdfBuffer(opts) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    buildInvoicePdf(doc, opts);
    doc.end();
  });
}

export { formatMoney, formatDate, formatDateTime, formatAddress };
