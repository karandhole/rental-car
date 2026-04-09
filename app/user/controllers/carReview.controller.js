import prisma from "../../../lib/db.config.js";

export const addReview = async (req, res) => {
  try {
    const { carId, userId, rating, comment } = req.body;

    const review = await prisma.review.create({
      data: { carId, userId, rating, comment }
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCarReviews = async (req, res) => {
  try {
    const { carId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { carId },
      include: {
        user: { select: { firstName: true, lastName: true } }
      }
    });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};