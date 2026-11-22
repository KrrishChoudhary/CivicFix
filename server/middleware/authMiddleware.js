// server/middleware/authMiddleware.js
// Authentication and Authorization Middlewares

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware: protect
 * Verifies the incoming Bearer JWT token from the Authorization header.
 * If valid, fetches user from database (excluding password) and attaches to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check if Authorization header is present and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      // 2. Extract token from header ("Bearer <token>")
      token = req.headers.authorization.split(" ")[1];

      // 3. Verify token with secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Find user by ID in token payload (decoded.id) and exclude password
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // 5. Attach user document to request object for downstream controllers
      req.user = user;
      return next();
    } catch (error) {
      console.error("[Auth Middleware] Token verification failed:", error.message);
      return res.status(401).json({ message: "Not authorized, token invalid or expired" });
    }
  }

  // If no token was found in the Authorization header
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

/**
 * Middleware: adminOnly
 * Restricts route access to users with the 'admin' role.
 * Must be used after 'protect' middleware so req.user is available.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    // 403 Forbidden: authenticated user lacks permission
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
};

module.exports = {
  protect,
  adminOnly,
};
