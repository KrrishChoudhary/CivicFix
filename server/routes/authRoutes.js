// server/routes/authRoutes.js
// Route definitions for authentication endpoints

const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes: user registration and login
router.post("/register", register);
router.post("/login", login);

// Protected route: get current logged-in user details
router.get("/me", protect, getMe);

module.exports = router;
