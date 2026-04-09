import express from "express";
import {
  createAdminCar,
  listAdminCars,
  getAdminCar,
  updateAdminCar,
  deleteAdminCar,
  toggleCarAvailability,
  toggleCarVerification,
} from "../controllers/car.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createFileUpload } from "../../utils/fileStorage.js";

const router = express.Router();

const upload = createFileUpload("cars");

const uploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "images", maxCount: 20 },
  { name: "documents", maxCount: 10 },
]);

router.get("/", authMiddleware, listAdminCars);
router.get("/:id", authMiddleware, getAdminCar);
router.post("/", authMiddleware, uploadFields, createAdminCar);
router.put("/:id", authMiddleware, uploadFields, updateAdminCar);
router.delete("/:id", authMiddleware, deleteAdminCar);
router.patch("/:id/toggle-availability", authMiddleware, toggleCarAvailability);
router.patch("/:id/toggle-verification", authMiddleware, toggleCarVerification);

export default router;
