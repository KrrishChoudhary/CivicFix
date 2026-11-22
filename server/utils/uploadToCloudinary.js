// server/utils/uploadToCloudinary.js
// Streams an in-memory buffer to Cloudinary

const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

/**
 * Uploads an image Buffer directly to Cloudinary into the specified folder.
 *
 * Viva Explanation:
 * Node.js built-in Readable.from(buffer) turns the memory buffer into a readable stream.
 * We pipe this stream into Cloudinary's upload_stream.
 * Once Cloudinary finishes processing and hosting the image, it returns a secure HTTPS URL.
 *
 * @param {Buffer} buffer - In-memory image buffer from multer (req.file.buffer)
 * @param {string} [folder="civicfix"] - Cloudinary destination folder
 * @returns {Promise<string>} - Resolves with the secure_url string
 */
const uploadToCloudinary = (buffer, folder = "civicfix") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    // Stream the buffer into Cloudinary
    Readable.from(buffer).pipe(uploadStream);
  });
};

module.exports = uploadToCloudinary;
