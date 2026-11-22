// server/config/cloudinary.js
// Cloudinary SDK configuration for media uploads

const cloudinary = require("cloudinary").v2;

/**
 * Configure Cloudinary with API credentials from environment variables.
 *
 * Viva Explanation:
 * We use Cloudinary SDK v2. The credentials (cloud name, API key, API secret)
 * authenticate our server with Cloudinary's REST API to manage and store citizen-uploaded media.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
