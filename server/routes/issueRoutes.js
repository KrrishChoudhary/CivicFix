// server/routes/issueRoutes.js
// Route definitions for civic issues

const express = require("express");
const router = express.Router();
const {
  createIssue,
  getIssues,
  getIssueById,
  getMyIssues,
  deleteIssue,
  updateIssueStatus,
  getIssueHistory,
  getNearbyIssues,
} = require("../controllers/issueController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { uploadSingleImage } = require("../middleware/uploadMiddleware");

// Public route: Get all issues (supports ?category= and ?status= query params)
router.get("/", getIssues);

/**
 * IMPORTANT ROUTING NOTE FOR VIVA:
 * GET /mine and GET /nearby must be defined BEFORE GET /:id.
 * If /:id came first, Express would capture the string "nearby" or "mine" as req.params.id,
 * causing an invalid ObjectId CastError or returning a 404.
 */
router.get("/mine", protect, getMyIssues);
router.get("/nearby", getNearbyIssues);

// Public route: Get status change audit history for an issue (oldest first)
router.get("/:id/history", getIssueHistory);

// Public route: Get a single issue by ID
router.get("/:id", getIssueById);

// Protected route: Report a new civic issue (supports multipart/form-data with optional 'image')
router.post("/", protect, uploadSingleImage, createIssue);

// Protected route: Delete an issue (owner or admin only)
router.delete("/:id", protect, deleteIssue);

// Protected Admin-only route: Update issue workflow status (linear transition)
router.patch("/:id/status", protect, adminOnly, updateIssueStatus);

module.exports = router;
