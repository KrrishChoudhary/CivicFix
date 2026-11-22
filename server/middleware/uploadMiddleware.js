// server/middleware/uploadMiddleware.js
// Multer file upload middleware with memory storage

const multer = require("multer");

/**
 * Memory storage:
 *
 * Viva Explanation:
 * Instead of saving files to the server's local disk (diskStorage), memoryStorage keeps
 * the incoming file in RAM as a Buffer (req.file.buffer).
 * This has major advantages:
 * 1. Zero disk I/O on the server, making it faster.
 * 2. Works seamlessly in cloud and serverless deployments (Render, Vercel, Docker) where
 *    local filesystems are ephemeral.
 * 3. No need to write cleanup scripts to delete temp files after uploading to Cloudinary.
 */
const storage = multer.memoryStorage();

// Permitted MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

/**
 * Custom file filter:
 * Validates that uploaded file has an allowed image MIME type.
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."),
      false
    );
  }
};

// Initialize multer single file upload for field "image"
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
}).single("image");

/**
 * Middleware wrapper:
 * Executes multer and catches file size or file type errors,
 * returning a user-friendly 400 Bad Request JSON response.
 */
const uploadSingleImage = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File size too large. Maximum allowed size is 5 MB.",
          });
        }
        return res.status(400).json({
          message: `Upload error: ${err.message}`,
        });
      }
      // Custom fileFilter error (wrong format)
      return res.status(400).json({
        message: err.message,
      });
    }
    next();
  });
};

module.exports = {
  uploadSingleImage,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
