import express from "express";
import { carPartnerAuthMiddleware } from "../middlewares/carPartner.middleware.js";
import {
  createUnavailabilityRequest,
  listMyUnavailabilityRequests,
  cancelUnavailabilityRequest,
} from "../controllers/unavailability.controller.js";

const router = express.Router();

router.use(carPartnerAuthMiddleware);

router.post("/", createUnavailabilityRequest);
router.get("/", listMyUnavailabilityRequests);
router.delete("/:id", cancelUnavailabilityRequest);

export default router;
