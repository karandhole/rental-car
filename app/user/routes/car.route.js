import express from "express";
import {
  createCar,
  getAllCars,
  getPopularCars,
  getCarById,
  updateCar,
  patchCar,
  deleteCar,
} from "../controllers/car.controller.js";

import { createImageUpload } from "../../utils/imageStorage.js";

const router = express.Router();
const upload = createImageUpload("cars");

router.post(
  "/",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createCar
);

router.get("/popular", getPopularCars);
router.get("/", getAllCars);
router.get("/:id", getCarById);
router.put("/:id", updateCar);
router.patch("/:id", patchCar);
router.delete("/:id", deleteCar);

export default router;