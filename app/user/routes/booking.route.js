import express from "express";
import {
  createBooking,
  getUserBookings,
  updateBookingStatus,
  getBookingById,
  getDashboardStats,
  extendBooking,
  checkAvailability,
} from "../controllers/booking.controller.js";

const router = express.Router();


router.post("/check-availability", checkAvailability);
router.post("/", createBooking);
router.get("/user/:userId", getUserBookings);
router.get("/user/:userId/stats", getDashboardStats);
router.patch("/:id/extend", extendBooking);
router.get("/:id", getBookingById);
router.patch("/:id/status", updateBookingStatus);

export default router;