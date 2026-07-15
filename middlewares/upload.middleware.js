import multer from "multer";
import fs from "fs";
import path from "path";

const createStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join("uploads", folder);

      fs.mkdirSync(dir, { recursive: true });

      cb(null, dir);
    },

    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

      cb(null, unique + path.extname(file.originalname));
    },
  });

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPG, JPEG and PDF files are allowed."));
  }
};

// Ride Start Upload
export const rideStartUpload = multer({
  storage: createStorage("ride-start"),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// Ride End Upload
export const rideEndUpload = multer({
  storage: createStorage("ride-end"),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});