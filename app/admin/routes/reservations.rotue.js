import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listAdminReservations,
  getAdminReservationById,
  createAdminReservation,
  updateAdminReservation,
  cancelAdminReservation,
} from "../controllers/reservations.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", listAdminReservations);
router.post("/:id/cancel", cancelAdminReservation);
router.get("/:id", getAdminReservationById);
router.post("/", createAdminReservation);
router.put("/:id", updateAdminReservation);

export default router;
