// client/src/components/UpvoteButton.jsx
// Interactive upvote button for civic issues with atomic toggle, count display, and permission handling

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

/**
 * UpvoteButton Component
 *
 * @param {string} issueId - MongoDB ObjectId of the issue
 * @param {number} initialCount - Initial upvote count
 * @param {boolean} initialUpvoted - Whether current logged-in user has upvoted
 * @param {boolean} isOwnIssue - Whether current logged-in user reported this issue
 * @param {boolean} isResolved - Whether the issue status is "resolved"
 * @param {string} size - Button size variant: "sm" (card listing) or "lg" (detail page)
 * @param {function} onUpvoteChange - Optional callback invoked with (newUpvoted, newCount)
 */
const UpvoteButton = ({
  issueId,
  initialCount = 0,
  initialUpvoted = false,
  isOwnIssue = false,
  isResolved = false,
  size = "sm",
  onUpvoteChange,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [upvoted, setUpvoted] = useState(!!initialUpvoted);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync internal state if initial props change (e.g. after refetching issue details)
  useEffect(() => {
    setUpvoted(!!initialUpvoted);
    setCount(Number(initialCount) || 0);
  }, [initialUpvoted, initialCount]);

  // Determine disable state and explanatory tooltip
  let isDisabled = false;
  let tooltipText = "";

  if (isResolved) {
    isDisabled = true;
    tooltipText = "Resolved issues cannot be upvoted";
  } else if (isOwnIssue) {
    isDisabled = true;
    tooltipText = "You cannot upvote your own reported issue";
  } else if (!isAuthenticated) {
    tooltipText = "Sign in to upvote this issue";
  } else {
    tooltipText = upvoted ? "Click to remove your upvote" : "Click to upvote this civic issue";
  }

  const handleToggleUpvote = async (e) => {
    // Prevent event bubbling to parent links or cards (especially in IssueCard)
    e.preventDefault();
    e.stopPropagation();

    // 1. If not authenticated, redirect to login page
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // 2. Prevent action if disabled or currently processing
    if (isDisabled || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // POST /api/issues/:id/upvote toggles upvote atomically
      const res = await api.post(`/issues/${issueId}/upvote`);
      const { upvoted: newUpvoted, upvoteCount: newCount } = res.data;

      setUpvoted(newUpvoted);
      setCount(newCount);

      if (onUpvoteChange) {
        onUpvoteChange(newUpvoted, newCount);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update upvote.";
      setErrorMessage(msg);
      // Auto-clear error tooltip after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`upvote-wrapper upvote-${size}`} title={errorMessage || tooltipText}>
      <button
        type="button"
        onClick={handleToggleUpvote}
        disabled={isDisabled || loading}
        className={`upvote-btn upvote-btn-${size} ${upvoted ? "upvoted" : ""} ${
          isDisabled ? "disabled" : ""
        }`}
        aria-label={`Upvote issue. Current count: ${count}`}
      >
        <span className="upvote-arrow" aria-hidden="true">
          {loading ? "…" : "▲"}
        </span>
        <span className="upvote-count">{count}</span>
        {size === "lg" && (
          <span className="upvote-label">
            {upvoted ? "Upvoted" : "Upvote"}
          </span>
        )}
      </button>

      {errorMessage && (
        <span className="upvote-inline-error">{errorMessage}</span>
      )}
    </div>
  );
};

export default UpvoteButton;
