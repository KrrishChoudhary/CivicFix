// client/src/components/IssueCard.jsx
// Card component displaying civic issue summary for lists and grids

import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import UpvoteButton from "./UpvoteButton";
import { useAuth } from "../context/AuthContext";
import { getCategoryMeta } from "../utils/categoryMeta";

// Workflow progression steps for 4-step tracker
const WORKFLOW_STEPS = [
  { id: "reported", label: "Reported" },
  { id: "verified", label: "Verified" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
];

const STATUS_INDEX_MAP = {
  reported: 0,
  verified: 1,
  in_progress: 2,
  resolved: 3,
};

// Helper to format date string
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const IssueCard = ({ issue }) => {
  const { user } = useAuth();

  // Check if current logged-in user reported this issue
  const reportedById = issue.reportedBy?._id || issue.reportedBy;
  const isOwnIssue = !!(
    user &&
    reportedById &&
    reportedById.toString() === user._id?.toString()
  );
  const isResolved = issue.status === "resolved";
  const catMeta = getCategoryMeta(issue.category);
  const statusIndex = STATUS_INDEX_MAP[issue.status] ?? 0;

  return (
    <Link to={`/issues/${issue._id}`} className="issue-card-link">
      <div className="issue-card">
        {issue.imageUrl ? (
          <div className="issue-card-image-wrapper">
            <img src={issue.imageUrl} alt={issue.title} className="issue-card-image" />
          </div>
        ) : (
          <div
            className="issue-card-image-placeholder"
            style={{
              background: `linear-gradient(135deg, ${catMeta.color}18 0%, var(--surface-2) 100%)`,
              borderBottom: `1px solid var(--border-color)`,
            }}
          >
            <span className="placeholder-cat-icon">{catMeta.icon}</span>
            <span className="placeholder-cat-label">{catMeta.label} · {catMeta.kannada}</span>
          </div>
        )}

        <div className="issue-card-body">
          <div className="issue-card-tags">
            <span
              className="issue-category-tag"
              style={{
                borderColor: `${catMeta.color}44`,
                backgroundColor: `${catMeta.color}15`,
              }}
            >
              <span className="cat-icon" aria-hidden="true">{catMeta.icon}</span>{" "}
              <span className="cat-label">{catMeta.label}</span>{" "}
              <span className="cat-kannada-sub" title={catMeta.kannadaTranslit}>
                · {catMeta.kannada}
              </span>
            </span>
            <StatusBadge status={issue.status} />
          </div>

          <h3 className="issue-card-title">{issue.title}</h3>

          {issue.address && (
            <p className="issue-card-address">
              📍 {issue.address}
            </p>
          )}

          {/* Compact 4-Step Progress Tracker */}
          <div className="card-progress-wrapper" aria-label={`Workflow stage: ${issue.status}`}>
            <div className="card-progress-track">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isCompleted = statusIndex > idx;
                const isCurrent = statusIndex === idx;
                const isPending = statusIndex < idx;

                let stepClass = "step-pending";
                if (isCompleted) stepClass = "step-completed";
                else if (isCurrent) stepClass = "step-current";

                return (
                  <div key={step.id} className={`card-step-item ${stepClass}`}>
                    <div className="card-step-indicator">
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <span className="card-step-name">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="issue-card-footer">
            <div
              className="issue-card-footer-left"
              onClick={(e) => {
                // Prevent card link navigation when clicking inside upvote area
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <UpvoteButton
                issueId={issue._id}
                initialCount={issue.upvoteCount}
                initialUpvoted={issue.hasUpvoted}
                isOwnIssue={isOwnIssue}
                isResolved={isResolved}
                size="sm"
              />
              <span className="issue-card-date">{formatDate(issue.createdAt)}</span>
            </div>

            <span className="issue-card-view-btn">View Details →</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default IssueCard;
