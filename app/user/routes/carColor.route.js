import express from "express";
import {
  createCarColor,
  getColorsByCar,
  deleteCarColor
} from "../controllers/carColor.controller.js";

const router = express.Router();

router.post("/", createCarColor);
router.get("/car/:carId", getColorsByCar);
router.delete("/:id", deleteCarColor);

export default router;