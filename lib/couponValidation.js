import prisma from "./db.config.js";

/** Admin UI uses "1" = percentage, "2" = fixed; legacy may use words. */
export function normalizeCouponType(type) {
  const t = String(type ?? "").toLowerCase();
  if (t === "1" || t === "percentage") return "percentage";
  if (t === "2" || t === "fixed") return "fixed";
  return t;
}

/**
 * @param {import("@prisma/client").Coupon} coupon
 * @param {number} subtotalBeforeDiscount — rental + delivery (whole rupees, >= 0)
 */
export function computeCouponDiscount(coupon, subtotalBeforeDiscount) {
  const subtotal = Math.max(0, Math.floor(Number(subtotalBeforeDiscount) || 0));
  const kind = normalizeCouponType(coupon.type);
  const value = Number(coupon.value);
  if (!Number.isFinite(value) || value < 0) return 0;

  if (kind === "percentage") {
    const raw = (subtotal * value) / 100;
    return Math.min(subtotal, Math.floor(raw));
  }
  return Math.min(subtotal, Math.floor(value));
}

function rentalDurationMs(pickup, ret) {
  const a = pickup instanceof Date ? pickup : new Date(pickup);
  const b = ret instanceof Date ? ret : new Date(ret);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return b.getTime() - a.getTime();
}

/**
 * @returns {Promise<string|null>} error message or null if OK
 */
export async function getCouponEligibilityError(coupon, ctx) {
  const { car, pickupDate, returnDate, userId } = ctx;

  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);
  if (now < start) return "This coupon is not active yet.";
  if (now > end) return "This coupon has expired.";
  if (String(coupon.status).toLowerCase() !== "active") return "This coupon is not active.";

  const limit = coupon.limit != null ? Number(coupon.limit) : null;
  if (limit && limit > 0 && coupon.usedCount >= limit) {
    return "This coupon has reached its usage limit.";
  }

  const rule = coupon.applicableTo;
  if (!rule || rule === "All") return null;

  const ms = rentalDurationMs(pickupDate, returnDate);
  if (ms == null || ms <= 0) return "Invalid rental dates for this coupon.";

  const hours = ms / (1000 * 60 * 60);
  const days = hours / 24;

  switch (String(rule)) {
    case "1": {
      // New customers — no completed or confirmed rental history
      if (!userId) return "Sign in to use this coupon.";
      const prior = await prisma.booking.count({
        where: {
          userId,
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
      });
      if (prior > 0) return "This coupon is only for new customers.";
      return null;
    }
    case "2": {
      if (days < 7) return "This coupon requires a rental of at least 7 days.";
      return null;
    }
    case "3": {
      // VIP — no flag on User model yet; allow (same as unrestricted)
      return null;
    }
    case "4": {
      const cat = car?.category ? String(car.category) : "";
      if (!/luxury/i.test(cat)) return "This coupon applies only to luxury cars.";
      return null;
    }
    case "5": {
      if (days < 30) return "This coupon requires a long rental (30+ days).";
      return null;
    }
    case "6": {
      // ALL Customer — no extra eligibility rules
      return null;
    }
    default:
      return null;
  }
}

export async function findCouponByCode(rawCode) {
  const code = String(rawCode ?? "").trim();
  if (!code) return null;
  const exact = await prisma.coupon.findFirst({ where: { code } });
  if (exact) return exact;
  return prisma.coupon.findFirst({
    where: { code: code.toUpperCase() },
  });
}
