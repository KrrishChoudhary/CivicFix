// server/models/User.js
// User Schema and Model for CivicFix
// Defines citizen and admin accounts with password hashing support and role-based access

const mongoose = require("mongoose");

/**
 * User Schema definition
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Creates a unique index in MongoDB to prevent duplicate emails
      lowercase: true, // Automatically converts email to lowercase before saving
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      // select: false ensures the password hash is NOT returned in queries by default.
      // To retrieve it for verification during login, explicitly use .select('+password')
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["citizen", "admin"],
        message: "{VALUE} is not a valid role",
      },
      default: "citizen", // All regular users default to citizen role
    },
  },
  {
    // Automatically creates and updates 'createdAt' and 'updatedAt' timestamps
    timestamps: true,
  }
);

// Compile schema into User model
const User = mongoose.model("User", userSchema);

module.exports = User;
