import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getUser, updateUser } from "../controllers/user.controller.js";
import { createDocumentUpload } from "../../utils/imageStorage.js";

const router = express.Router();

const userDocsUpload = createDocumentUpload("users");

const userDocFields = userDocsUpload.fields([
  { name: "dlPdf", maxCount: 1 },
  { name: "aadhaarPdf", maxCount: 1 },
  { name: "addressProofPdf", maxCount: 1 },
]);

router.get("/", authMiddleware, getUser);
router.patch("/", authMiddleware, (req, res, next) => {
  userDocFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message || "File upload failed. Use PDF only, max 4MB per file.",
      });
    }
    next();
  });
}, updateUser);

export default router;