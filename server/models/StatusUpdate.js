// server/models/StatusUpdate.js
// Audit trail and timeline history for civic issue status changes

const mongoose = require("mongoose");

/**
 * StatusUpdate Schema definition
 * Records every state change in an issue's lifecycle for transparency and auditability.
 */
const statusUpdateSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: [true, "Issue reference is required"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["reported", "verified", "in_progress", "resolved"],
        message: "{VALUE} is not a valid status",
      },
    },
    remark: {
      type: String,
      trim: true,
      maxlength: [500, "Remark cannot exceed 500 characters"],
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Updating user ID is required"],
    },
  },
  {
    // Automatically creates 'createdAt' and 'updatedAt' timestamps
    timestamps: true,
  }
);

/**
 * Index on 'issue' field:
 *
 * Viva Explanation:
 * Status updates will be looked up frequently by issue ID (GET /api/issues/:id/history).
 * Without this index, MongoDB would have to scan every document in the StatusUpdate collection.
 * An index on { issue: 1, createdAt: 1 } ensures fast, indexed retrieval sorted chronologically.
 */
statusUpdateSchema.index({ issue: 1, createdAt: 1 });

const StatusUpdate = mongoose.model("StatusUpdate", statusUpdateSchema);

module.exports = StatusUpdate;
