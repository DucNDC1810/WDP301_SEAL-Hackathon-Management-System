import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Allowed file types
const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`));
  },
});

/**
 * Upload buffer to Cloudinary, return { url, original_name, mime_type, size }
 */
export const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "seal-hackathon/chat", resource_type: "auto" },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          original_name: file.originalname,
          mime_type: file.mimetype,
          size: file.size,
        });
      }
    );
    Readable.from(file.buffer).pipe(stream);
  });
