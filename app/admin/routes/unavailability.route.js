import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listAllUnavailabilityRequests,
  approveUnavailabilityRequest,
  rejectUnavailabilityRequest,
} from "../controllers/unavailability.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listAllUnavailabilityRequests);
router.put("/:id/approve", approveUnavailabilityRequest);
router.put("/:id/reject", rejectUnavailabilityRequest);

export default router;
