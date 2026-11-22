// server/utils/statusFlow.js
// CivicFix State Machine Definition for Issue Status Workflow

/**
 * Linear workflow mapping each status to its next allowed status:
 * reported -> verified -> in_progress -> resolved
 *
 * "resolved" is a terminal state; no transitions are permitted out of "resolved".
 */
const NEXT_ALLOWED_STATUS = {
  reported: "verified",
  verified: "in_progress",
  in_progress: "resolved",
  resolved: null,
};

/**
 * Validates whether transitioning from status 'from' to status 'to' is allowed.
 * Only strictly the next step forward in the workflow is permitted.
 *
 * @param {string} from - The current status of the issue
 * @param {string} to - The requested target status
 * @returns {boolean} - True if transition is valid, false otherwise
 */
const canTransition = (from, to) => {
  if (!from || !to) return false;
  return NEXT_ALLOWED_STATUS[from] === to;
};

module.exports = {
  NEXT_ALLOWED_STATUS,
  canTransition,
};
