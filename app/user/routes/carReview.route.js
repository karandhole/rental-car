import express from "express";
import {
  addReview,
  getCarReviews
} from "../controllers/carReview.controller.js";

const router = express.Router();

router.post("/", addReview);
router.get("/car/:carId", getCarReviews);

export default router;