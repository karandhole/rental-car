import prisma from "../../../lib/db.config.js";
import {
  computeCouponDiscount,
  getCouponEligibilityError,
} from "../../../lib/couponValidation.js";

export const createBooking = async (req, res) => {
  try {
    const {
      carId,
      pricingId,
      userId,
      duration,
      totalPrice,
      totalAmount, // Legacy frontend property
      bookingType,
      deliveryAddress,
      deliveryLocation, // Legacy frontend property
      returnAddress,
      returnLocation, // Legacy frontend property
      sameReturn,
      pickupDate,
      startDate, // Legacy frontend property
      returnDate,
      endDate, // Legacy frontend property
      color,
      hexCode,
      orderId,
      paymentId,
      distanceKM,
      deliveryFee,
      car, // Passed sometimes in legacy payload
      couponId,
      preDiscountTotal,
    } = req.body;

    // Graceful mapping to support older frontend payloads still in Redux cache
    const finalUserId = userId || req.user?.id; // If you add auth middleware later
    let resolvedTotal = Math.round(Number(totalPrice || totalAmount || 0));
    const finalDeliveryAddress = deliveryAddress || deliveryLocation;
    const finalReturnAddress = returnAddress || returnLocation;
    const finalPickupDate = pickupDate || startDate;
    const finalReturnDate = returnDate || endDate;

    // Extract duration from pricing array if missing
    let finalDuration = duration;
    if (!finalDuration) {
      if (car && car.pricing && car.pricing.length > 0) {
        finalDuration = car.pricing[0].duration;
      } else {
        finalDuration = "DAY"; // safe default
      }
    }

    if (!finalUserId) {
      return res.status(400).json({
        message: "userId is required. Please restart checkout or login again.",
      });
    }

    if (!carId) {
      return res.status(400).json({ message: "carId is required." });
    }
    const carBookingCheck = await prisma.car.findUnique({
      where: { id: carId },
      select: { isVerified: true },
    });
    if (!carBookingCheck) {
      return res.status(400).json({ message: "Car not found." });
    }
    if (!carBookingCheck.isVerified) {
      return res.status(400).json({
        message: "This vehicle is not available for booking.",
      });
    }

    let resolvedCouponId = null;

    if (couponId) {
      const pre = Math.round(Number(preDiscountTotal));
      if (!Number.isFinite(pre) || pre < 0) {
        return res.status(400).json({
          message: "preDiscountTotal is required when a coupon is applied.",
        });
      }

      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon." });
      }

      const carRow = await prisma.car.findUnique({ where: { id: carId } });
      const eligErr = await getCouponEligibilityError(coupon, {
        car: carRow,
        pickupDate: finalPickupDate,
        returnDate: finalReturnDate,
        userId: finalUserId,
      });
      if (eligErr) {
        return res.status(400).json({ message: eligErr });
      }

      const discount = computeCouponDiscount(coupon, pre);
      const serverFinal = Math.max(0, pre - discount);

      if (Math.abs(serverFinal - resolvedTotal) > 1) {
        return res.status(400).json({
          message: "Total does not match coupon discount. Please refresh checkout.",
        });
      }

      resolvedTotal = serverFinal;
      resolvedCouponId = coupon.id;
    }

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          carId,
          pricingId,
          userId: finalUserId,
          duration: finalDuration,
          totalPrice: resolvedTotal,
          bookingType: bookingType?.toUpperCase() || "DELIVERY",
          deliveryAddress: finalDeliveryAddress,
          returnAddress: finalReturnAddress,
          sameReturn,
          pickupDate: finalPickupDate,
          returnDate: finalReturnDate,
          color,
          hexCode,
          orderId,
          paymentId,
          distanceKM,
          deliveryFee,
          couponId: resolvedCouponId,
        },
      });

      if (resolvedCouponId) {
        const fresh = await tx.coupon.findUnique({
          where: { id: resolvedCouponId },
        });
        const lim = fresh?.limit != null ? Number(fresh.limit) : null;
        if (lim && lim > 0 && fresh.usedCount >= lim) {
          throw new Error("This coupon has reached its usage limit.");
        }
        await tx.coupon.update({
          where: { id: resolvedCouponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        car: true,
        pricing: true
      }
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await prisma.booking.update({
      where: { id },
      data: { status }
    });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Extend an in-progress (CONFIRMED) booking's return time.
 * If other customers' active bookings on the same car overlap the new window, they are cancelled (extension wins).
 */
export const extendBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, returnDate, endDate } = req.body;
    const finalUserId = userId || req.user?.id;
    const newEndRaw = returnDate ?? endDate;

    if (!finalUserId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (!newEndRaw) {
      return res.status(400).json({ message: "returnDate is required." });
    }

    const newReturnDate = new Date(newEndRaw);
    if (Number.isNaN(newReturnDate.getTime())) {
      return res.status(400).json({ message: "returnDate must be a valid date." });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        carId: true,
        pickupDate: true,
        returnDate: true,
        status: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.userId !== finalUserId) {
      return res.status(403).json({ message: "You can only extend your own booking." });
    }
    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({
        message: "Only in-progress (confirmed) bookings can be extended.",
      });
    }

    const pickup = new Date(booking.pickupDate);
    const currentReturn = new Date(booking.returnDate);

    if (newReturnDate.getTime() <= currentReturn.getTime()) {
      return res.status(400).json({
        message: "New return time must be after the current return time.",
      });
    }
    if (newReturnDate.getTime() <= pickup.getTime()) {
      return res.status(400).json({
        message: "Return time must be after pickup time.",
      });
    }

    const conflicts = await prisma.booking.findMany({
      where: {
        carId: booking.carId,
        userId: { not: booking.userId },
        id: { not: booking.id },
        status: { in: ["PENDING", "CONFIRMED"] },
        pickupDate: { lt: newReturnDate },
        returnDate: { gt: pickup },
      },
      select: { id: true },
    });

    const conflictIds = conflicts.map((c) => c.id);

    const updated = await prisma.$transaction(async (tx) => {
      if (conflictIds.length > 0) {
        await tx.booking.updateMany({
          where: { id: { in: conflictIds } },
          data: { status: "CANCELLED" },
        });
      }
      return tx.booking.update({
        where: { id: booking.id },
        data: { returnDate: newReturnDate },
        include: { car: true, pricing: true },
      });
    });

    res.json({
      booking: updated,
      cancelledBookingIds: conflictIds,
      message:
        conflictIds.length > 0
          ? `Booking extended. ${conflictIds.length} conflicting booking(s) were cancelled.`
          : "Booking extended successfully.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: true,
        pricing: true,
        payment: true,
      },
    });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const [bookings, payments] = await Promise.all([
      prisma.booking.findMany({
        where: { userId },
        include: { car: { select: { name: true, images: true } }, pricing: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId, status: "SUCCESS" },
        include: { booking: { include: { car: { select: { name: true, images: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const statusCounts = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      totalBookings: bookings.length,
      statusCounts,
      totalSpent,
      recentBookings: bookings.slice(0, 5),
      recentPayments: payments.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};