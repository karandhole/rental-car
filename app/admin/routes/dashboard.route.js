import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getAdminDashboard } from "../controllers/dashboard.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getAdminDashboard);

export default router;
