// server/config/db.js
// Database connection configuration using Mongoose

const mongoose = require("mongoose");

/**
 * Connect to MongoDB database
 * Reads the connection URI from the MONGO_URI environment variable
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.error(
      `[MongoDB] Tip: Ensure your local MongoDB service is running or provide a valid MongoDB Atlas connection string in server/.env`
    );
  }
};

module.exports = connectDB;
