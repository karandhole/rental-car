import prisma from "../../../lib/db.config.js";

/** Persist "1" = percentage, "2" = fixed (accepts legacy words from older clients). */
function toStoredCouponType(type) {
  if (type == null || String(type).trim() === "") return "1";
  const t = String(type).trim().toLowerCase();
  if (t === "1" || t === "percentage") return "1";
  if (t === "2" || t === "fixed") return "2";
  return String(type).trim();
}

export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { name, code, description, type, value, startDate, endDate, limit, applicableTo } = req.body;
    const coupon = await prisma.coupon.create({
      data: {
        name,
        code,
        description,
        type: toStoredCouponType(type),
        value: parseFloat(value),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit: limit ? parseInt(limit) : null,
        applicableTo,
        status: 'Active',
        adminId
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A coupon with this code already exists. Please use a unique code." });
    }
    res.status(400).json({ error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, type, value, startDate, endDate, limit, applicableTo, status } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        name,
        code,
        description,
        type: toStoredCouponType(type),
        value: parseFloat(value),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit: limit ? parseInt(limit) : null,
        applicableTo,
        status
      },
    });
    res.status(200).json(coupon);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A coupon with this code already exists. Please use a unique code." });
    }
    res.status(400).json({ error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
