import { Router } from "express";
import { register, login, changePassword } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/change-password",authMiddleware, changePassword);

export default router;