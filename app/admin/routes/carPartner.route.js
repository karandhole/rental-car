import {
    getAllCarPartner,
    updateCarPartnerStatus,
    updateCarPartnerByAdmin,
} from "../controllers/carPartner.controller.js";
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getAllCarPartner);
router.patch("/:id/status", updateCarPartnerStatus);
router.patch("/:id", updateCarPartnerByAdmin);

export default router;