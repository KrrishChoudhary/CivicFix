// server/scripts/createAdmin.js
// Standalone script to create or update an Admin user in MongoDB
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env

const path = require("path");
// Ensure .env is loaded from server/.env regardless of current working directory
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

/**
 * Create or update an admin user
 */
const createAdmin = async () => {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  // 1. Validate required environment variables
  if (!MONGO_URI) {
    console.error("[Admin Setup Error] MONGO_URI is missing in .env");
    process.exit(1);
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "[Admin Setup Error] ADMIN_EMAIL and ADMIN_PASSWORD must be defined in server/.env"
    );
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 6) {
    console.error("[Admin Setup Error] ADMIN_PASSWORD must be at least 6 characters long");
    process.exit(1);
  }

  try {
    // 2. Connect to MongoDB
    console.log("[Admin Setup] Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("[Admin Setup] Connected to database successfully.");

    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();

    // 3. Hash the admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // 4. Check if a user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      console.log(`[Admin Setup] User ${normalizedEmail} already exists. Updating to admin role and updating password...`);
      existingUser.name = existingUser.name || "CivicFix Admin";
      existingUser.role = "admin";
      existingUser.password = hashedPassword;
      await existingUser.save();
      console.log(`[Admin Setup] Successfully updated user ${normalizedEmail} to role: admin.`);
    } else {
      // Create new admin user
      const adminUser = await User.create({
        name: "CivicFix Admin",
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log(`[Admin Setup] Successfully created admin user: ${adminUser.email} (ID: ${adminUser._id})`);
    }

    // 5. Disconnect from database and exit cleanly
    await mongoose.disconnect();
    console.log("[Admin Setup] Disconnected from MongoDB. Admin setup completed.");
    process.exit(0);
  } catch (error) {
    console.error("[Admin Setup Failed]:", error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Execute script
createAdmin();
