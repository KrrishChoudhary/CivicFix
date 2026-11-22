// client/src/pages/AdminDashboard.jsx
// Administrative console for managing and transitioning civic issue statuses

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";

// Linear status progression mapping
const NEXT_ALLOWED_STATUS = {
  reported: "verified",
  verified: "in_progress",
  in_progress: "resolved",
  resolved: null,
};

const ACTION_BUTTON_LABELS = {
  verified: "Verify Issue",
  in_progress: "Start Work",
  resolved: "Mark Resolved",
};

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "pothole", label: "Pothole" },
  { value: "garbage", label: "Garbage" },
  { value: "streetlight", label: "Streetlight" },
  { value: "water_leak", label: "Water Leak" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "reported", label: "Reported" },
  { value: "verified", label: "Verified" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AdminDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Store per-row remark input state: { [issueId]: "remark text" }
  const [remarks, setRemarks] = useState({});
  // Track which issue is currently being updated to show row-level loading spinner
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch all issues from backend
  const fetchAllIssues = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get("/issues", { params });
      setIssues(res.data.issues || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load issues for admin console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIssues();
  }, [categoryFilter, statusFilter]);

  const handleRemarkChange = (issueId, text) => {
    setRemarks((prev) => ({
      ...prev,
      [issueId]: text,
    }));
  };

  // Status transition handler (calls PATCH /api/issues/:id/status)
  const handleStatusUpdate = async (issueId, nextStatus) => {
    setError("");
    setSuccess("");
    setUpdatingId(issueId);

    const remark = remarks[issueId] || "";

    try {
      const res = await api.patch(`/issues/${issueId}/status`, {
        status: nextStatus,
        remark: remark.trim(),
      });

      // Update issue in local state immediately
      setIssues((prevIssues) =>
        prevIssues.map((item) =>
          item._id === issueId ? { ...item, status: nextStatus } : item
        )
      );

      // Clear remark for this row
      setRemarks((prev) => ({ ...prev, [issueId]: "" }));
      setSuccess(`Issue successfully updated to "${nextStatus}".`);

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || `Failed to update issue status to ${nextStatus}.`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-container admin-page-container">
      <div className="admin-header">
        <div>
          <h1>Admin Control Panel</h1>
          <p className="admin-subtitle">
            Review civic issue reports across Bengaluru and advance workflow statuses.
          </p>
        </div>

        <Link to="/map" className="btn btn-outline btn-sm">
          View on Map
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filter Controls Bar */}
      <div className="admin-filters-bar">
        <div className="filter-group">
          <label htmlFor="admin-cat-filter">Category:</label>
          <select
            id="admin-cat-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="admin-status-filter">Status:</label>
          <select
            id="admin-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-count-badge">
          {loading ? "Loading..." : `${issues.length} total ${issues.length === 1 ? "issue" : "issues"}`}
        </div>
      </div>

      {/* Issues Table */}
      <div className="admin-table-card">
        {loading ? (
          <div className="loading-container" style={{ minHeight: "200px" }}>
            <div className="spinner"></div>
            <p>Loading issue records...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="empty-state-card">
            <p>No issues found matching the selected filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Date</th>
                  <th>Workflow Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const nextStatus = NEXT_ALLOWED_STATUS[issue.status];
                  const actionLabel = nextStatus ? ACTION_BUTTON_LABELS[nextStatus] : null;
                  const isRowUpdating = updatingId === issue._id;

                  return (
                    <tr key={issue._id}>
                      <td className="table-title-cell">
                        <Link to={`/issues/${issue._id}`} className="table-title-link">
                          <strong>{issue.title}</strong>
                        </Link>
                        {issue.address && (
                          <small className="table-subtext">📍 {issue.address}</small>
                        )}
                      </td>

                      <td className="capitalize">{issue.category.replace("_", " ")}</td>

                      <td>
                        <StatusBadge status={issue.status} />
                      </td>

                      <td>{issue.reportedBy?.name || "Citizen"}</td>

                      <td>{formatDate(issue.createdAt)}</td>

                      {/* Action Column */}
                      <td className="table-action-cell">
                        {issue.status === "resolved" ? (
                          <span className="resolved-checkmark">✓ Resolved</span>
                        ) : (
                          <div className="action-control-group">
                            <input
                              type="text"
                              placeholder="Optional remark..."
                              value={remarks[issue._id] || ""}
                              onChange={(e) => handleRemarkChange(issue._id, e.target.value)}
                              disabled={isRowUpdating}
                              className="action-remark-input"
                            />
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(issue._id, nextStatus)}
                              disabled={isRowUpdating}
                              className="btn btn-primary btn-sm action-btn"
                            >
                              {isRowUpdating ? "Updating..." : actionLabel}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
