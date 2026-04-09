import prisma from "../../../lib/db.config.js";

export const createPricing = async (req, res) => {
  try {
    const { carId, colorId, duration, price } = req.body;

    const pricing = await prisma.pricing.create({
      data: { carId, colorId, duration, price }
    });

    res.status(201).json(pricing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getPricingByCar = async (req, res) => {
  try {
    const { carId } = req.params;

    const pricing = await prisma.pricing.findMany({
      where: { carId },
      include: { color: true }
    });

    res.json(pricing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};