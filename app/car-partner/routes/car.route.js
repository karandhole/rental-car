import express from "express";
import { carPartnerAuthMiddleware } from "../middlewares/carPartner.middleware.js";
import {
  createPartnerCar,
  listPartnerCars,
  getPartnerCar,
  updatePartnerCar,
  deletePartnerCar,
} from "../controllers/car.controller.js";
import { createFileUpload } from "../../utils/fileStorage.js";

const router = express.Router();
const upload = createFileUpload("cars");

const uploadFields = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "thumbnail", maxCount: 1 },
  { name: "documents", maxCount: 10 },
]);

router.use(carPartnerAuthMiddleware);

router.post("/", uploadFields, createPartnerCar);
router.get("/", listPartnerCars);
router.get("/:id", getPartnerCar);
router.put("/:id", uploadFields, updatePartnerCar);
router.delete("/:id", deletePartnerCar);

export default router;
