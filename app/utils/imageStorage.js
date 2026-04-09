import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
        cb(new Error("Only JPG, PNG, WEBP images are allowed"), false);
    } else {
        cb(null, true);
    }
};

/**
 * Ensure folder exists, if not create it
 */
const ensureFolderExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

export const createImageUpload = (folder = "common") => {
    const uploadPath = path.join(process.cwd(), "uploads", folder);

    // 👇 auto-create folder
    ensureFolderExists(uploadPath);

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const fileName = `${uuidv4()}${ext}`;
            file.relativePath = `/uploads/${folder}/${fileName}`;
            console.log(file.relativePath);
            cb(null, fileName);
        },
    });

    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
        },
    });
};

const DOCUMENT_MIMES = ["application/pdf", "application/x-pdf"];

const documentFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext === ".pdf") {
        cb(null, true);
        return;
    }
    if (DOCUMENT_MIMES.includes(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new Error("Only PDF files are allowed"), false);
};

/** User KYC uploads (Aadhaar, address proof, optional DL) — PDF only, 4MB. */
export const createDocumentUpload = (folder = "users") => {
    const uploadPath = path.join(process.cwd(), "uploads", folder);
    ensureFolderExists(uploadPath);

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const fileName = `${uuidv4()}${ext}`;
            file.relativePath = `/uploads/${folder}/${fileName}`;
            cb(null, fileName);
        },
    });

    return multer({
        storage,
        fileFilter: documentFileFilter,
        limits: {
            fileSize: 4 * 1024 * 1024,
        },
    });
};