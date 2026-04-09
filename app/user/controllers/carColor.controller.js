import prisma from "../../../lib/db.config.js";

export const createCarColor = async (req, res) => {
  try {
    const { carId, name, hexCode } = req.body;

    const color = await prisma.carColor.create({
      data: { carId, name, hexCode }
    });

    res.status(201).json(color);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getColorsByCar = async (req, res) => {
  try {
    const { carId } = req.params;

    console.log(carId)

    const colors = await prisma.carColor.findMany({
      where: { carId }
    });

    res.json(colors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCarColor = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.carColor.delete({ where: { id } });
    res.json({ message: "Color deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};