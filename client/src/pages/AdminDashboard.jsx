// client/src/pages/AdminDashboard.jsx
// Administrative console for managing civic issue workflows and reviewing analytics

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
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

// Color mapping matching StatusBadge styling
const STATUS_CHART_COLORS = {
  reported: "#f59e0b", // Amber
  verified: "#3b82f6", // Blue
  in_progress: "#8b5cf6", // Purple
  resolved: "#10b981", // Emerald Green
};

const CATEGORY_DISPLAY_NAMES = {
  pothole: "Pothole",
  garbage: "Garbage",
  streetlight: "Streetlight",
  water_leak: "Water Leak",
  other: "Other",
};

const STATUS_DISPLAY_NAMES = {
  reported: "Reported",
  verified: "Verified",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDayTick = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = parts[2];
  const month = monthNames[parseInt(parts[1], 10) - 1];
  return `${day} ${month}`;
};

const AdminDashboard = () => {
  // Table state
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortByPriority, setSortByPriority] = useState(false);

  // Per-row remark inputs & updating state
  const [remarks, setRemarks] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  // Analytics stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Fetch aggregated statistics from GET /api/admin/stats
  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      setStatsError(
        err.response?.data?.message || "Failed to load administrative analytics."
      );
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch issues list from GET /api/issues
  const fetchAllIssues = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (sortByPriority) params.sort = "priority";

      const res = await api.get("/issues", { params });
      setIssues(res.data.issues || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load issues for admin console.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAllIssues();
  }, [categoryFilter, statusFilter, sortByPriority]);

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
      await api.patch(`/issues/${issueId}/status`, {
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

      // Refresh analytics stats to reflect status advancement
      fetchStats();

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

  // Prepare chart datasets
  const categoryChartData = stats?.byCategory?.map((item) => ({
    name: CATEGORY_DISPLAY_NAMES[item.category] || item.category,
    count: item.count,
  })) || [];

  const statusChartData = stats?.byStatus?.map((item) => ({
    name: STATUS_DISPLAY_NAMES[item.status] || item.status,
    value: item.count,
    statusKey: item.status,
  })) || [];

  const trendChartData = stats?.perDay?.map((item) => ({
    date: item.date,
    displayDate: formatDayTick(item.date),
    count: item.count,
  })) || [];

  const hasStatusData = statusChartData.some((item) => item.value > 0);

  return (
    <div className="page-container admin-page-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>Admin Control Panel & Analytics</h1>
          <p className="admin-subtitle">
            Municipal triage console, aggregated analytics pipelines, and workflow progress.
          </p>
        </div>

        <Link to="/map" className="btn btn-outline btn-sm">
          View on Map
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {statsError && <div className="alert alert-danger">{statsError}</div>}

      {/* Analytics KPI Cards & Statistical Charts Section */}
      <div className="admin-analytics-section">
        <h2 className="analytics-section-title">📊 Operational Overview</h2>

        {statsLoading ? (
          <div className="loading-container" style={{ minHeight: "150px" }}>
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        ) : !stats || stats.totals?.total === 0 ? (
          <div className="empty-state-card" style={{ marginBottom: "2rem" }}>
            <p>No civic issues recorded yet to compute analytics charts.</p>
          </div>
        ) : (
          <>
            {/* Summary KPI Metric Cards */}
            <div className="admin-metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">📋</div>
                <div className="metric-details">
                  <span className="metric-label">Total Issues</span>
                  <span className="metric-value">{stats.totals.total}</span>
                </div>
              </div>

              <div className="metric-card metric-open">
                <div className="metric-icon">⏳</div>
                <div className="metric-details">
                  <span className="metric-label">Open / In Progress</span>
                  <span className="metric-value">{stats.totals.open}</span>
                </div>
              </div>

              <div className="metric-card metric-resolved">
                <div className="metric-icon">✅</div>
                <div className="metric-details">
                  <span className="metric-label">Resolved Issues</span>
                  <span className="metric-value">{stats.totals.resolved}</span>
                </div>
              </div>

              <div className="metric-card metric-resolution">
                <div className="metric-icon">⚡</div>
                <div className="metric-details">
                  <span className="metric-label">Avg Resolution Time</span>
                  <span className="metric-value">
                    {stats.avgResolutionHours !== null
                      ? `${stats.avgResolutionHours}h`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="admin-charts-grid">
              {/* 1. Bar Chart: Issues by Category */}
              <div className="chart-card">
                <h3 className="chart-title">Issues by Category</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 10, right: 15, left: -15, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Issues" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Donut/Pie Chart: Issues by Status */}
              <div className="chart-card">
                <h3 className="chart-title">Issues by Status</h3>
                <div className="chart-wrapper">
                  {!hasStatusData ? (
                    <div className="chart-empty-message">No status data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {statusChartData.map((entry) => (
                            <Cell
                              key={entry.statusKey}
                              fill={STATUS_CHART_COLORS[entry.statusKey] || "#94a3b8"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 3. Line Chart: 30-Day Activity Trend */}
              <div className="chart-card chart-card-wide">
                <h3 className="chart-title">Issues Created Per Day (Last 30 Days)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={trendChartData}
                      margin={{ top: 10, right: 20, left: -15, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        minTickGap={25}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#2563eb" }}
                        activeDot={{ r: 5 }}
                        name="New Issues"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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

        <div className="filter-group sort-toggle-group">
          <button
            type="button"
            className={`btn btn-sm ${sortByPriority ? "btn-primary" : "btn-outline"} sort-toggle-btn`}
            onClick={() => setSortByPriority((prev) => !prev)}
            title={
              sortByPriority
                ? "Sorted by priority score (highest first)"
                : "Click to sort by dynamic priority score"
            }
          >
            {sortByPriority ? "⚡ Sorted by Priority" : "🕒 Sort by Priority"}
          </button>
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
                  <th>Priority</th>
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

                      <td className="table-priority-cell">
                        <span
                          className="priority-pill"
                          title="Dynamic priority score (Severity + Upvotes*2 + Age)"
                        >
                          ⚡ {issue.priorityScore ?? 0}
                        </span>
                      </td>

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
