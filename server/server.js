// server/server.js
// Main entry point for the CivicFix Express server

// 1. Load environment variables from .env file into process.env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// 2. Initialize the Express application
const app = express();

// 3. Connect to MongoDB database
connectDB();

// 4. Global Middlewares
// Enable CORS so the React frontend can make API requests
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Built-in middleware to parse incoming JSON payloads into req.body
app.use(express.json());

// 5. Basic Routes
// Health check route - used to quickly verify if backend is active and responding
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Authentication routes (register, login, getMe) mounted at /api/auth
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// 6. Error Handling Middlewares
// Catch requests to undefined routes (404)
app.use(notFound);

// Catch any unhandled errors and format response as JSON (500)
app.use(errorHandler);

// 7. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[CivicFix Server] Running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
});
