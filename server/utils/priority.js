// server/utils/priority.js
// Dynamic civic issue priority scoring algorithm

/**
 * Category severity weights:
 * Potholes and Water Leaks: 3 (high immediate danger to road safety and water supply)
 * Streetlights and Garbage: 2 (medium public health / neighborhood safety concern)
 * Other: 1 (general civic maintenance)
 */
const CATEGORY_WEIGHTS = {
  pothole: 3,
  water_leak: 3,
  streetlight: 2,
  garbage: 2,
  other: 1,
};

/**
 * Calculate dynamic priority score for an issue.
 *
 * Viva Explanation of Formula:
 * 1. Resolved issues = 0: Once resolved, no civic or municipal intervention is required.
 * 2. Category Weight (* 10): Infrastructure & hazard severity. Potholes / leaks start with 30 pts;
 *    streetlights / garbage start with 20 pts; other starts with 10 pts.
 * 3. Citizen Upvotes (* 2): Community urgency. Each additional citizen who upvotes adds 2 pts,
 *    giving voice to heavily impacted neighborhoods.
 * 4. Issue Age (min(ageInDays, 30)): Starvation prevention. Each day an issue remains open,
 *    its priority increments by 1 point (capped at 30 days so ancient low-severity issues
 *    do not overshadow critical new emergencies).
 *
 * Why calculate dynamically on read rather than storing in DB?
 * Because ageInDays continuously changes over time. Computing dynamically on read ensures
 * the score is always fresh and accurate without requiring scheduled background cron jobs.
 *
 * @param {Object} issue - Mongoose document or plain object
 * @returns {number} - Calculated priority score
 */
const calculatePriority = (issue) => {
  if (!issue) return 0;

  // 1. Resolved issues have 0 priority
  if (issue.status === "resolved") {
    return 0;
  }

  // 2. Base category weight
  const catWeight = CATEGORY_WEIGHTS[issue.category] || 1;
  const categoryScore = catWeight * 10;

  // 3. Citizen upvotes (each upvote adds 2 points)
  const upvotes = Math.max(0, issue.upvoteCount || 0);
  const upvoteScore = upvotes * 2;

  // 4. Age in days (capped at 30 days)
  const createdAt = issue.createdAt ? new Date(issue.createdAt) : new Date();
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - createdAt.getTime());
  const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const ageScore = Math.min(ageInDays, 30);

  return categoryScore + upvoteScore + ageScore;
};

module.exports = {
  calculatePriority,
  CATEGORY_WEIGHTS,
};
