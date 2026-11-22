// server/models/Upvote.js
// Tracks citizen upvotes on civic issues

const mongoose = require("mongoose");

const upvoteSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: [true, "Issue reference is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * UNIQUE Compound Index on { issue: 1, user: 1 }
 *
 * Viva Explanation:
 * Why a database-level unique compound index is safer than checking in application code:
 * 1. Race Condition Prevention: If two concurrent HTTP requests arrive from the same user simultaneously,
 *    an application-level check (e.g. `const exists = await Upvote.findOne(...)`) could return null in both
 *    threads before either inserts, creating duplicate upvotes.
 * 2. Atomic Integrity: MongoDB's B-Tree index guarantees uniqueness at the storage engine level, making
 *    duplicate upvotes physically impossible regardless of server concurrency or clustering.
 */
upvoteSchema.index({ issue: 1, user: 1 }, { unique: true });

const Upvote = mongoose.model("Upvote", upvoteSchema);

module.exports = Upvote;
