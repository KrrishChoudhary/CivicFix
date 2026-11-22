// server/controllers/adminController.js
// Handles administrative analytics and aggregated statistical metrics

const Issue = require("../models/Issue");
const StatusUpdate = require("../models/StatusUpdate");

/**
 * @desc    Get aggregated civic issue statistics and chart metrics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 *
 * Viva Explanation of Aggregation Pipelines:
 * 1. byCategory:
 *    - $group: Groups documents by the "category" field and calculates sum of documents.
 *    - $project: Reshapes documents to { category: "$_id", count: 1 } and removes internal _id.
 * 2. byStatus:
 *    - $group: Groups documents by "status" and counts them.
 * 3. perDay (Last 30 Days):
 *    - $match: Filters issues created within the past 30 days ($gte: thirtyDaysAgo).
 *    - $group: Uses $dateToString to group by calendar date (YYYY-MM-DD).
 *    - Zero-fill in JS: MongoDB only aggregates existing documents; we backfill zero-count
 *      days in JS so the 30-day timeline chart has continuous daily data.
 * 4. avgResolutionHours:
 *    - $match: Selects StatusUpdate records where status is "resolved".
 *    - $lookup: Left outer join with the "issues" collection to fetch original createdAt.
 *    - $unwind: Deconstructs the joined array into a single embedded object.
 *    - $project: Calculates difference ($subtract: [statusUpdate.createdAt, issue.createdAt])
 *      divided by 3,600,000 (ms to hours).
 *    - $group: Computes $avg of durationHours across all resolved issues.
 * 5. totals:
 *    - Computes total issues, resolved issues, and active open issues.
 */
const getAdminStats = async (req, res, next) => {
  try {
    // 1. byCategory Aggregation
    const rawByCategory = await Issue.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Ensure all predefined categories are present in byCategory for consistent charts
    const categoryCountMap = {};
    rawByCategory.forEach((item) => {
      categoryCountMap[item.category] = item.count;
    });

    const byCategory = Issue.ALLOWED_CATEGORIES.map((cat) => ({
      category: cat,
      count: categoryCountMap[cat] || 0,
    }));

    // 2. byStatus Aggregation
    const rawByStatus = await Issue.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
    ]);

    const statusCountMap = {};
    rawByStatus.forEach((item) => {
      statusCountMap[item.status] = item.count;
    });

    const byStatus = Issue.ALLOWED_STATUSES.map((st) => ({
      status: st,
      count: statusCountMap[st] || 0,
    }));

    // 3. perDay Aggregation (Last 30 days including days with zero)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    const rawPerDay = await Issue.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const perDayMap = {};
    rawPerDay.forEach((item) => {
      perDayMap[item._id] = item.count;
    });

    // Generate unbroken sequence of the last 30 calendar days
    const perDay = [];
    const currentDate = new Date(thirtyDaysAgo);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      perDay.push({
        date: dateStr,
        count: perDayMap[dateStr] || 0,
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // 4. avgResolutionHours Aggregation
    // Measures time elapsed from issue creation until it was marked "resolved" in StatusUpdate
    const resolutionStats = await StatusUpdate.aggregate([
      {
        $match: { status: "resolved" },
      },
      {
        $lookup: {
          from: "issues",
          localField: "issue",
          foreignField: "_id",
          as: "issueDoc",
        },
      },
      {
        $unwind: "$issueDoc",
      },
      {
        $project: {
          durationHours: {
            $divide: [
              { $subtract: ["$createdAt", "$issueDoc.createdAt"] },
              1000 * 60 * 60, // convert milliseconds to hours
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: "$durationHours" },
        },
      },
    ]);

    const avgResolutionHours =
      resolutionStats.length > 0 && resolutionStats[0].avgHours !== null
        ? Number(resolutionStats[0].avgHours.toFixed(1))
        : null;

    // 5. Totals: total issues, open issues, resolved issues
    const total = await Issue.countDocuments({});
    const resolved = statusCountMap["resolved"] || 0;
    const open = Math.max(0, total - resolved);

    res.status(200).json({
      byCategory,
      byStatus,
      perDay,
      avgResolutionHours,
      totals: {
        total,
        open,
        resolved,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
};
