import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getUsers,
  getUserById,
  toggleUserStatus
} from "../controllers/user.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getUsers);

router.get("/:id", getUserById);

router.patch("/:id/toggle-block", toggleUserStatus);

export default router;