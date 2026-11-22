// server/server.js
// Main entry point for the CivicFix Express server

// 1. Load environment variables from .env file into process.env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// 2. Initialize the Express application
const app = express();

// Trust reverse proxy (e.g. Render, Heroku) so req.protocol, req.ip, and secure cookies are preserved
app.set("trust proxy", 1);

// Security HTTP headers
app.use(helmet());

// 3. Connect to MongoDB database (skipped during automated tests using in-memory MongoDB)
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

// 4. Global Middlewares
// Parse CLIENT_URL which can hold one or more comma-separated allowed origins (e.g. local and deployed frontends)
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Render load-balancer health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Built-in middleware to parse incoming JSON payloads into req.body
app.use(express.json());

// Rate limiter for authentication endpoints (mitigate brute force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per 15-minute window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    message: "Too many authentication attempts from this IP, please try again after 15 minutes",
  },
});

// 5. Basic Routes
// Health check route - used to quickly verify if backend is active and responding
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Authentication routes (register, login, getMe) mounted at /api/auth with rate limiting
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authLimiter, authRoutes);

// Issue routes mounted at /api/issues
const issueRoutes = require("./routes/issueRoutes");
app.use("/api/issues", issueRoutes);

// Admin analytics routes mounted at /api/admin
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// 6. Error Handling Middlewares
// Catch requests to undefined routes (404)
app.use(notFound);

// Catch any unhandled errors and format response as JSON (500)
app.use(errorHandler);

// 7. Start the Server only when executed directly, not during test execution
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[CivicFix Server] Running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  });
}

module.exports = app;
