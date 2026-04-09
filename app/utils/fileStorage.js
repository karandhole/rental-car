import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

/**
 * createFileUpload - handles mixed image + document uploads
 * @param {string} folder - subfolder inside /uploads
 */
export const createFileUpload = (folder = "common") => {
  const uploadPath = path.join(process.cwd(), "uploads", folder);
  ensureFolderExists(uploadPath);

  const docPath = path.join(process.cwd(), "uploads", `${folder}/documents`);
  ensureFolderExists(docPath);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "documents") {
        cb(null, docPath);
      } else {
        cb(null, uploadPath);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const fileName = `${uuidv4()}${ext}`;
      if (file.fieldname === "documents") {
        file.relativePath = `/uploads/${folder}/documents/${fileName}`;
      } else {
        file.relativePath = `/uploads/${folder}/${fileName}`;
      }
      cb(null, fileName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed =
      file.fieldname === "documents" ? ALLOWED_DOC_TYPES : ALLOWED_IMAGE_TYPES;
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed for field: ${file.fieldname}`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });
};
