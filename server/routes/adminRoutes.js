// server/routes/adminRoutes.js
// Administrative routes for analytics and reporting

const express = require("express");
const router = express.Router();
const { getAdminStats } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Protected Admin-only route: Aggregated analytics and stats
router.get("/stats", protect, adminOnly, getAdminStats);

module.exports = router;
