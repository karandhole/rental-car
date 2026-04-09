import express from "express";
import {
  getCarPartnerProfile,
  updateCarPartnerProfile,
  changeCarPartnerPassword,
} from "../controllers/carPartner.controller.js";
import { carPartnerAuthMiddleware } from "../middlewares/carPartner.middleware.js";

const router = express.Router();

router.get("/profile", carPartnerAuthMiddleware, getCarPartnerProfile);
router.patch("/profile", carPartnerAuthMiddleware, updateCarPartnerProfile);
router.patch("/password", carPartnerAuthMiddleware, changeCarPartnerPassword);

export default router;
