// client/src/components/IssueCard.jsx
// Card component displaying civic issue summary for lists and grids

import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

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
            <span className="issue-card-date">{formatDate(issue.createdAt)}</span>
            <span className="issue-card-view-btn">View Details →</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default IssueCard;
