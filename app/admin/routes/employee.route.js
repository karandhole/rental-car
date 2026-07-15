import { Router } from "express";
import {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
} from "../controllers/employee.controller.js";

import { superAdminMiddleware } from "../middlewares/superAdmin.middleware.js";
import { generateTokens } from "../../utils/token.util.js";

const router = Router();


router.post("/", superAdminMiddleware, createEmployee);

router.get("/", superAdminMiddleware, getEmployees);

router.put("/:id", superAdminMiddleware, updateEmployee);

router.delete("/:id", superAdminMiddleware, deleteEmployee);

router.patch("/:id/status", superAdminMiddleware, updateEmployeeStatus);

export default router;