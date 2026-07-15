import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  rideStartUpload,
  rideEndUpload,
} from "../../../middlewares/upload.middleware.js";

import {
  startRide,
  endRide,
} from "../controllers/ride.controller.js";

const router = express.Router();

router.post(
  "/start/:bookingId",
  authMiddleware,
  rideStartUpload.fields([
    {
      name: "odometerImages",
      maxCount: 5,
    },
    {
      name: "interiorImages",
      maxCount: 10,
    },
    {
      name: "exteriorImages",
      maxCount: 10,
    },
    {
      name: "rideDocuments",
      maxCount: 10,
    },
    {
      name: "paymentProofImages",
      maxCount: 3,
    },
  ]),
  startRide
);

router.post(
  "/end/:bookingId",
  authMiddleware,
  rideEndUpload.fields([
    {
      name: "odometerImages",
      maxCount: 5,
    },
    {
      name: "interiorImages",
      maxCount: 5,
    },
    {
      name: "exteriorImages",
      maxCount: 10,
    },
  ]),
  endRide
);

export default router;