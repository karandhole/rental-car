import prisma from "../../../lib/db.config.js";

// ─── Create Seasonal Pricing ──────────────────────────────────────────────────
export const createSeasonalPricing = async (req, res) => {
  try {
    const { carId, name, startDate, endDate, hourPrice, dayPrice, weekPrice, monthPrice, isActive } = req.body;

    if (!carId || !name || !startDate || !endDate) {
      return res.status(400).json({ message: "carId, name, startDate and endDate are required" });
    }

    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const sp = await prisma.seasonalPricing.create({
      data: {
        carId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        hourPrice: hourPrice != null ? parseFloat(hourPrice) : null,
        dayPrice: dayPrice != null ? parseFloat(dayPrice) : null,
        weekPrice: weekPrice != null ? parseFloat(weekPrice) : null,
        monthPrice: monthPrice != null ? parseFloat(monthPrice) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    res.status(201).json({ message: "Seasonal pricing created", data: sp });
  } catch (error) {
    res.status(500).json({ message: "Error creating seasonal pricing", error: error.message });
  }
};

// ─── List Seasonal Pricing ────────────────────────────────────────────────────
export const listSeasonalPricing = async (req, res) => {
  try {
    const { carId } = req.query;
    const where = carId ? { carId } : {};

    const list = await prisma.seasonalPricing.findMany({
      where,
      include: { car: { select: { id: true, name: true, thumbnail: true } } },
      orderBy: { startDate: "asc" },
    });

    res.status(200).json({ count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ message: "Error fetching seasonal pricing", error: error.message });
  }
};

// ─── Get Single Seasonal Pricing ──────────────────────────────────────────────
export const getSeasonalPricing = async (req, res) => {
  try {
    const sp = await prisma.seasonalPricing.findUnique({
      where: { id: req.params.id },
      include: { car: { select: { id: true, name: true } } },
    });
    if (!sp) return res.status(404).json({ message: "Seasonal pricing not found" });
    res.status(200).json({ data: sp });
  } catch (error) {
    res.status(500).json({ message: "Error fetching seasonal pricing", error: error.message });
  }
};

// ─── Update Seasonal Pricing ──────────────────────────────────────────────────
export const updateSeasonalPricing = async (req, res) => {
  try {
    const existing = await prisma.seasonalPricing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Seasonal pricing not found" });

    const { name, startDate, endDate, hourPrice, dayPrice, weekPrice, monthPrice, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (hourPrice !== undefined) data.hourPrice = hourPrice !== null ? parseFloat(hourPrice) : null;
    if (dayPrice !== undefined) data.dayPrice = dayPrice !== null ? parseFloat(dayPrice) : null;
    if (weekPrice !== undefined) data.weekPrice = weekPrice !== null ? parseFloat(weekPrice) : null;
    if (monthPrice !== undefined) data.monthPrice = monthPrice !== null ? parseFloat(monthPrice) : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const sp = await prisma.seasonalPricing.update({ where: { id: req.params.id }, data });
    res.status(200).json({ message: "Seasonal pricing updated", data: sp });
  } catch (error) {
    res.status(500).json({ message: "Error updating seasonal pricing", error: error.message });
  }
};

// ─── Delete Seasonal Pricing ──────────────────────────────────────────────────
export const deleteSeasonalPricing = async (req, res) => {
  try {
    const existing = await prisma.seasonalPricing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Seasonal pricing not found" });

    await prisma.seasonalPricing.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Seasonal pricing deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting seasonal pricing", error: error.message });
  }
};
