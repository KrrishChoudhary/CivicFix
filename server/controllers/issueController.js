// server/controllers/issueController.js
// Handles CRUD operations for civic issues in Bengaluru

const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const StatusUpdate = require("../models/StatusUpdate");
const { canTransition } = require("../utils/statusFlow");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

/**
 * @desc    Create a new civic issue
 * @route   POST /api/issues
 * @access  Private (Protected by JWT)
 */
const createIssue = async (req, res, next) => {
  try {
    const { title, description, category, latitude, longitude, address, imageUrl } = req.body;

    // 1. Validate required text fields
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ message: "Title cannot exceed 100 characters" });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }
    if (description.trim().length > 1000) {
      return res.status(400).json({ message: "Description cannot exceed 1000 characters" });
    }

    // 2. Validate category enum
    if (!category || !Issue.ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `Category must be one of: ${Issue.ALLOWED_CATEGORIES.join(", ")}`,
      });
    }

    // 3. Validate coordinates (latitude and longitude)
    // Note: In multipart/form-data, numbers arrive as strings
    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === null ||
      longitude === null ||
      latitude === "" ||
      longitude === ""
    ) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Latitude and longitude must be valid numbers" });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({ message: "Latitude must be between -90 and 90" });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Longitude must be between -180 and 180" });
    }

    // 4. Handle optional image upload (file from multer or optional string URL)
    let finalImageUrl = "";
    if (req.file) {
      try {
        finalImageUrl = await uploadToCloudinary(req.file.buffer, "civicfix");
      } catch (uploadError) {
        console.error("[Cloudinary Upload Error]:", uploadError.message);
        return res.status(500).json({
          message: "Failed to upload image to cloud storage. Issue was not created.",
        });
      }
    } else if (imageUrl && typeof imageUrl === "string") {
      finalImageUrl = imageUrl.trim();
    }

    // 5. Build GeoJSON Point
    // Note: GeoJSON specification strictly requires [longitude, latitude]
    const location = {
      type: "Point",
      coordinates: [lng, lat],
    };

    // 6. Create issue
    // Security note: status is explicitly hardcoded to "reported", ignoring any client-sent status
    const issue = await Issue.create({
      title: title.trim(),
      description: description.trim(),
      category,
      location,
      address: address ? address.trim() : "",
      imageUrl: finalImageUrl,
      status: "reported",
      reportedBy: req.user._id,
    });

    // 7. Record the initial status update event in the history timeline
    await StatusUpdate.create({
      issue: issue._id,
      status: "reported",
      updatedBy: req.user._id,
      remark: "Issue reported",
    });

    res.status(201).json({
      message: "Issue reported successfully",
      issue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all civic issues (with optional category and status filtering, newest first)
 * @route   GET /api/issues
 * @access  Public
 */
const getIssues = async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const filter = {};

    // Apply optional category filter
    if (category) {
      filter.category = category;
    }

    // Apply optional status filter
    if (status) {
      filter.status = status;
    }

    // Fetch issues: sort by newest first (-1), populate reportedBy name only
    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .populate("reportedBy", "name");

    res.status(200).json({
      count: issues.length,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single issue by ID
 * @route   GET /api/issues/:id
 * @access  Public
 */
const getIssueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const issue = await Issue.findById(id).populate("reportedBy", "name");

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    res.status(200).json({ issue });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get issues reported by the currently logged-in user
 * @route   GET /api/issues/mine
 * @access  Private (Protected by JWT)
 */
const getMyIssues = async (req, res, next) => {
  try {
    const issues = await Issue.find({ reportedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate("reportedBy", "name");

    res.status(200).json({
      count: issues.length,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an issue (only owner or admin can delete)
 * @route   DELETE /api/issues/:id
 * @access  Private (Protected by JWT)
 */
const deleteIssue = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Authorization check: Only owner of the issue or an admin can delete
    const isOwner = issue.reportedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this issue",
      });
    }

    await Issue.findByIdAndDelete(id);

    res.status(200).json({
      message: "Issue deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update issue status (linear admin workflow)
 * @route   PATCH /api/issues/:id/status
 * @access  Private (Admin only)
 */
const updateIssueStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    // 1. Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // 2. Find issue
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // 3. Validate status transition using linear state machine
    if (!status || !canTransition(issue.status, status)) {
      return res.status(400).json({
        message: `Cannot transition issue status from "${issue.status}" to "${status || "undefined"}"`,
      });
    }

    // 4. Validate remark length
    if (remark && typeof remark === "string" && remark.length > 500) {
      return res.status(400).json({ message: "Remark cannot exceed 500 characters" });
    }

    // 5. Update issue status
    issue.status = status;
    await issue.save();

    // 6. Record StatusUpdate audit record
    const statusUpdate = await StatusUpdate.create({
      issue: issue._id,
      status,
      remark: remark ? remark.trim() : "",
      updatedBy: req.user._id,
    });

    // 7. Return the updated issue
    res.status(200).json({
      message: `Issue status updated to ${status}`,
      issue,
      statusUpdate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get status update history for an issue (oldest first)
 * @route   GET /api/issues/:id/history
 * @access  Public
 */
const getIssueHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // 2. Check if issue exists
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // 3. Retrieve status update timeline (oldest first: 1), populate updatedBy name only
    const history = await StatusUpdate.find({ issue: id })
      .sort({ createdAt: 1 })
      .populate("updatedBy", "name");

    res.status(200).json({
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  getMyIssues,
  deleteIssue,
  updateIssueStatus,
  getIssueHistory,
};
