// server/models/Issue.js
// CivicFix - Bengaluru Civic Issue Schema & Model
// Represents citizen-reported civic issues (potholes, garbage, streetlights, water leaks, etc.)

const mongoose = require("mongoose");

/**
 * Allowed categories for civic issues in Bengaluru
 */
const ALLOWED_CATEGORIES = [
  "pothole",
  "garbage",
  "streetlight",
  "water_leak",
  "other",
];

/**
 * Allowed workflow statuses for civic issues
 */
const ALLOWED_STATUSES = [
  "reported",
  "verified",
  "in_progress",
  "resolved",
];

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ALLOWED_CATEGORIES,
        message: "{VALUE} is not a valid category",
      },
    },
    // imageUrl is optional for now; Cloudinary integration will populate this in a later step
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    /**
     * Location stored as a GeoJSON Point object:
     * GeoJSON specification strictly requires coordinates in [longitude, latitude] order (x, y).
     * Longitude ranges from -180 to +180; Latitude ranges from -90 to +90.
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Coordinates [longitude, latitude] are required"],
        validate: {
          validator: function (coords) {
            if (!Array.isArray(coords) || coords.length !== 2) return false;
            const [lng, lat] = coords;
            return (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !isNaN(lng) &&
              !isNaN(lat) &&
              lng >= -180 &&
              lng <= 180 &&
              lat >= -90 &&
              lat <= 90
            );
          },
          message:
            "Coordinates must be [longitude, latitude] where -180 <= lng <= 180 and -90 <= lat <= 90",
        },
      },
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_STATUSES,
        message: "{VALUE} is not a valid status",
      },
      default: "reported", // All newly created issues start as "reported"
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporting user ID is required"],
    },
  },
  {
    // Automatically creates and manages 'createdAt' and 'updatedAt' timestamps
    timestamps: true,
  }
);

/**
 * 2dsphere Geospatial Index on 'location'
 *
 * Viva Explanation:
 * The 2dsphere index calculates geometries on an earth-like sphere (WGS84 datum).
 * In MongoDB, creating a '2dsphere' index allows us to run geospatial queries such as:
 * - $nearSphere / $geoNear: to find civic issues near the citizen's current GPS location
 * - $geoWithin: to find issues within a specific ward boundary, bounding box, or polygon
 * Without this index, spherical distance and proximity queries would fail or perform a slow full-collection scan.
 */
issueSchema.index({ location: "2dsphere" });

const Issue = mongoose.model("Issue", issueSchema);
Issue.ALLOWED_CATEGORIES = ALLOWED_CATEGORIES;
Issue.ALLOWED_STATUSES = ALLOWED_STATUSES;

module.exports = Issue;
