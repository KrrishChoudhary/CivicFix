// client/src/components/IssueCard.jsx
// Card component displaying civic issue summary for lists and grids

import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import UpvoteButton from "./UpvoteButton";
import { useAuth } from "../context/AuthContext";

// Helper to format category slug into human-readable label
const formatCategory = (cat) => {
  const map = {
    pothole: "Pothole",
    garbage: "Garbage",
    streetlight: "Streetlight",
    water_leak: "Water Leak",
    other: "Other",
  };
  return map[cat] || cat;
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

  return (
    <Link to={`/issues/${issue._id}`} className="issue-card-link">
      <div className="issue-card">
        {issue.imageUrl ? (
          <div className="issue-card-image-wrapper">
            <img src={issue.imageUrl} alt={issue.title} className="issue-card-image" />
          </div>
        ) : (
          <div className="issue-card-image-placeholder">
            <span>📷 No Photo</span>
          </div>
        )}

        <div className="issue-card-body">
          <div className="issue-card-tags">
            <span className="issue-category-tag">{formatCategory(issue.category)}</span>
            <StatusBadge status={issue.status} />
          </div>

          <h3 className="issue-card-title">{issue.title}</h3>

          {issue.address && (
            <p className="issue-card-address">
              📍 {issue.address}
            </p>
          )}

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
