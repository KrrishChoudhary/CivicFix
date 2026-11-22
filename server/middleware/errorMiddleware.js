// server/middleware/errorMiddleware.js
// Centralized error handling and 404 route handling

/**
 * Middleware to catch any request to routes that do not exist (404 Not Found)
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Passes the error forward to the global errorHandler
};

/**
 * Global error-handling middleware
 * Express identifies an error middleware by the 4 arguments: (err, req, res, next)
 */
const errorHandler = (err, req, res, next) => {
  // If the status code was still 200 (OK), default to 500 (Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    // Only show stack trace in development mode for easier debugging
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
