import prisma from "../../../lib/db.config.js";
import {
  findCouponByCode,
  computeCouponDiscount,
  getCouponEligibilityError,
} from "../../../lib/couponValidation.js";

/**
 * POST /api/coupons/validate
 * Body: { code, subtotalBeforeDiscount, carId, pickupDate, returnDate, userId? }
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotalBeforeDiscount, carId, pickupDate, returnDate, userId } =
      req.body;

    const subtotal = Math.floor(Number(subtotalBeforeDiscount));
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return res.status(400).json({ message: "Invalid subtotalBeforeDiscount" });
    }
    if (!carId || !pickupDate || !returnDate) {
      return res
        .status(400)
        .json({ message: "carId, pickupDate, and returnDate are required" });
    }

    const coupon = await findCouponByCode(code);
    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      return res.status(400).json({ message: "Car not found" });
    }
    if (!car.isVerified) {
      return res.status(400).json({ message: "Car not found" });
    }

    const err = await getCouponEligibilityError(coupon, {
      car,
      pickupDate,
      returnDate,
      userId: userId || null,
    });
    if (err) {
      return res.status(400).json({ message: err });
    }

    const discountAmount = computeCouponDiscount(coupon, subtotal);
    const finalTotal = Math.max(0, subtotal - discountAmount);

    return res.status(200).json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
      },
      discountAmount,
      finalTotal,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Coupon validation failed" });
  }
};
