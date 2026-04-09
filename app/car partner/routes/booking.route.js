import express from "express";
import { getReservations, getReservationById } from "../controllers/booking.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getReservations);
router.get("/:id", getReservationById);

export default router;
