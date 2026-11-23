// client/src/pages/AdminDashboard.jsx
// Administrative console for managing civic issue workflows and reviewing analytics
// Redesigned with two distinct tabs: "Overview" (KPIs, Charts, Needs Attention) and "Manage Issues" (Sticky filters, Table with mobile cards, Pagination)
// Persists active tab in URL hash (#overview or #issues)

import { useState, useEffect, useMemo } from "react";
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
} from "recharts";
import api from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import StatusBadge from "../components/StatusBadge";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { CATEGORY_OPTIONS, getCategoryMeta } from "../utils/categoryMeta";

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

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "reported", label: "Reported" },
  { value: "verified", label: "Verified" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

// Theme-aware color palettes for Recharts ensuring high-contrast readability
const THEME_CHART_CONFIG = {
  light: {
    gridStroke: "#e2e8f0",
    tickFill: "#64748b",
    tooltipBg: "#ffffff",
    tooltipBorder: "#cbd5e1",
    tooltipText: "#0f172a",
    barColor: "#2563eb",
    lineColor: "#2563eb",
    statusColors: {
      reported: "#f59e0b",
      verified: "#3b82f6",
      in_progress: "#8b5cf6",
      resolved: "#10b981",
    },
  },
  dark: {
    gridStroke: "#26334d",
    tickFill: "#94a3b8",
    tooltipBg: "#151c2c",
    tooltipBorder: "#2e3e5c",
    tooltipText: "#f1f5f9",
    barColor: "#3b82f6",
    lineColor: "#60a5fa",
    statusColors: {
      reported: "#fbbf24",
      verified: "#60a5fa",
      in_progress: "#a78bfa",
      resolved: "#34d399",
    },
  },
  ocean: {
    gridStroke: "#17425f",
    tickFill: "#7dd3fc",
    tooltipBg: "#0c2538",
    tooltipBorder: "#1e4a66",
    tooltipText: "#f0f9ff",
    barColor: "#06b6d4",
    lineColor: "#38bdf8",
    statusColors: {
      reported: "#facc15",
      verified: "#38bdf8",
      in_progress: "#818cf8",
      resolved: "#2dd4bf",
    },
  },
  sunset: {
    gridStroke: "#4a2254",
    tickFill: "#fda4af",
    tooltipBg: "#241429",
    tooltipBorder: "#4a2254",
    tooltipText: "#fff1f2",
    barColor: "#f43f5e",
    lineColor: "#fb7185",
    statusColors: {
      reported: "#fb923c",
      verified: "#f472b6",
      in_progress: "#c084fc",
      resolved: "#4ade80",
    },
  },
  namma: {
    gridStroke: "#e4decb",
    tickFill: "#57534e",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d4ceb8",
    tooltipText: "#18181b",
    barColor: "#d97706",
    lineColor: "#dc2626",
    statusColors: {
      reported: "#d97706",
      verified: "#2563eb",
      in_progress: "#8b5cf6",
      resolved: "#16a34a",
    },
  },
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

const PAGE_SIZE = 10;

const AdminDashboard = () => {
  const { theme } = useTheme();
  const chartTheme = THEME_CHART_CONFIG[theme] || THEME_CHART_CONFIG.light;

  // 1. Remember Tab via URL Hash (#overview or #issues)
  const getInitialTab = () => {
    if (typeof window !== "undefined" && window.location.hash === "#issues") {
      return "issues";
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#issues") {
        setActiveTab("issues");
      } else {
        setActiveTab("overview");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.location.hash = tabId === "issues" ? "#issues" : "#overview";
    }
  };

  // Table & Issues State
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters State
  const [searchTitle, setSearchTitle] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortByPriority, setSortByPriority] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

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
      setCurrentPage(1); // Reset to page 1 on filter/fetch change
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

      // Refresh aggregated stats to keep charts in sync
      fetchStats();

      setSuccess(`Issue workflow status transitioned to "${nextStatus}" successfully.`);
      setRemarks((prev) => {
        const copy = { ...prev };
        delete copy[issueId];
        return copy;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update issue status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Client-side search filtering by title
  const filteredIssues = useMemo(() => {
    if (!searchTitle.trim()) return issues;
    const q = searchTitle.toLowerCase().trim();
    return issues.filter((i) => (i.title || "").toLowerCase().includes(q));
  }, [issues, searchTitle]);

  // Client-side pagination slices
  const totalFiltered = filteredIssues.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const startIdx = totalFiltered === 0 ? 0 : (validPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(validPage * PAGE_SIZE, totalFiltered);
  const paginatedIssues = filteredIssues.slice(startIdx, endIdx);

  // Top 5 "Needs Attention" open issues (by priority score)
  const needsAttentionIssues = useMemo(() => {
    return [...issues]
      .filter((i) => i.status !== "resolved")
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 5);
  }, [issues]);

  // Chart data formatting
  const categoryChartData = useMemo(() => {
    if (!stats?.byCategory) return [];
    return stats.byCategory.map((item) => {
      const meta = getCategoryMeta(item.category);
      return {
        name: meta.label,
        count: item.count,
        color: meta.color,
      };
    });
  }, [stats]);

  const statusChartData = useMemo(() => {
    if (!stats?.byStatus) return [];
    return stats.byStatus.map((item) => ({
      name: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1).replace("_", " ") : "Unknown",
      statusKey: item._id,
      count: item.count,
    }));
  }, [stats]);

  const trendChartData = useMemo(() => {
    if (!stats?.perDay) return [];
    return stats.perDay.map((item) => ({
      date: item.date,
      displayDate: formatDayTick(item.date),
      count: item.count,
    }));
  }, [stats]);

  // Today's formatted date string
  const todayDateFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="page-container admin-dashboard-page-container">
      {/* 1. Page Header with Title, Today's Date, and Quick Actions */}
      <section className="admin-header-card" aria-labelledby="admin-title">
        <div className="admin-header-main">
          <div className="admin-header-badge">
            <span className="badge badge-admin">🛡️ BBMP Admin Console</span>
            <span className="admin-header-date">📅 {todayDateFormatted}</span>
          </div>
          <h1 id="admin-title" className="admin-page-title">
            Bengaluru Municipal Operations Console
          </h1>
          <p className="admin-subtitle">
            Municipal triage console, aggregated analytics pipelines, and ward workflow progress.
          </p>
        </div>

        <div className="admin-header-actions">
          <Link to="/map" className="btn btn-outline btn-sm">
            🗺️ Public Map
          </Link>
          <Link to="/report" className="btn btn-primary btn-sm">
            + Report Issue
          </Link>
        </div>
      </section>

      {/* 2. Top-Level Tab Switcher (#overview vs #issues) */}
      <nav className="admin-tabs-nav" role="tablist" aria-label="Administrative Console Sections">
        <button
          type="button"
          role="tab"
          id="tab-btn-overview"
          aria-selected={activeTab === "overview"}
          aria-controls="panel-overview"
          className={`admin-nav-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => switchTab("overview")}
        >
          <span className="tab-btn-icon">📊</span>
          <span>City Overview &amp; Analytics</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-btn-issues"
          aria-selected={activeTab === "issues"}
          aria-controls="panel-issues"
          className={`admin-nav-tab-btn ${activeTab === "issues" ? "active" : ""}`}
          onClick={() => switchTab("issues")}
        >
          <span className="tab-btn-icon">📋</span>
          <span>Manage Civic Issues</span>
          <span className="admin-tab-count-pill">{issues.length}</span>
        </button>
      </nav>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {statsError && <div className="alert alert-danger">{statsError}</div>}

      {/* ========================================================
          TAB PANEL 1: OVERVIEW & ANALYTICS
          ======================================================== */}
      {activeTab === "overview" && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-btn-overview"
          className="admin-tab-panel"
        >
          {/* A. KPI Metric Cards Row */}
          <section className="admin-kpi-section" aria-label="Key Performance Indicators">
            <div className="admin-metrics-grid">
              {/* Metric 1: Total */}
              <div className="metric-card">
                <div className="metric-icon-wrapper metric-icon-total">📢</div>
                <div className="metric-content">
                  <span className="metric-label">Total Issues Logged</span>
                  {statsLoading ? (
                    <div className="stat-skeleton"></div>
                  ) : (
                    <span className="metric-value">{stats?.totals?.total ?? 0}</span>
                  )}
                  <span className="metric-desc">Across all wards</span>
                </div>
              </div>

              {/* Metric 2: Open */}
              <div className="metric-card">
                <div className="metric-icon-wrapper metric-icon-open">⚡</div>
                <div className="metric-content">
                  <span className="metric-label">Open / In Progress</span>
                  {statsLoading ? (
                    <div className="stat-skeleton"></div>
                  ) : (
                    <span className="metric-value">{stats?.totals?.open ?? 0}</span>
                  )}
                  <span className="metric-desc">Awaiting resolution</span>
                </div>
              </div>

              {/* Metric 3: Resolved */}
              <div className="metric-card">
                <div className="metric-icon-wrapper metric-icon-resolved">✅</div>
                <div className="metric-content">
                  <span className="metric-label">Resolved Issues</span>
                  {statsLoading ? (
                    <div className="stat-skeleton"></div>
                  ) : (
                    <span className="metric-value">{stats?.totals?.resolved ?? 0}</span>
                  )}
                  <span className="metric-desc">Work certified</span>
                </div>
              </div>

              {/* Metric 4: Avg Resolution Time */}
              <div className="metric-card">
                <div className="metric-icon-wrapper metric-icon-time">⏱️</div>
                <div className="metric-content">
                  <span className="metric-label">Avg Resolution Time</span>
                  {statsLoading ? (
                    <div className="stat-skeleton"></div>
                  ) : (
                    <span className="metric-value">
                      {stats?.avgResolutionHours !== null && stats?.avgResolutionHours !== undefined
                        ? stats.avgResolutionHours >= 24
                          ? `${(stats.avgResolutionHours / 24).toFixed(1)}d`
                          : `${stats.avgResolutionHours}h`
                        : "N/A"}
                    </span>
                  )}
                  <span className="metric-desc">Creation to certification</span>
                </div>
              </div>
            </div>
          </section>

          {/* B. Charts Section in 2-Column Grid + Full Width Trend */}
          <section className="admin-charts-section" aria-label="Analytical Visualizations">
            {statsLoading ? (
              <Loader message="Loading municipal analytics..." minHeight="220px" />
            ) : !stats || stats.totals?.total === 0 ? (
              <EmptyState
                title="No civic data recorded yet"
                message="Once citizens report issues across Bengaluru wards, live statistical charts and status funnels will appear here."
              />
            ) : (
              <div className="admin-charts-grid">
                {/* Chart 1: Category Distribution */}
                <div className="chart-card">
                  <h3 className="chart-title">Issues by Category</h3>
                  <p className="chart-subtitle">Breakdown of reported civic infrastructure issues</p>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={categoryChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartTheme.tickFill }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chartTheme.tooltipBg,
                            borderColor: chartTheme.tooltipBorder,
                            color: chartTheme.tooltipText,
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cat-cell-${index}`} fill={entry.color || chartTheme.barColor} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Status Breakdown Donut */}
                <div className="chart-card">
                  <h3 className="chart-title">Workflow Status Breakdown</h3>
                  <p className="chart-subtitle">Proportion of issues at each operational phase</p>
                  <div className="chart-wrapper chart-donut-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {statusChartData.map((entry) => (
                            <Cell
                              key={`status-cell-${entry.statusKey}`}
                              fill={chartTheme.statusColors[entry.statusKey] || chartTheme.barColor}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chartTheme.tooltipBg,
                            borderColor: chartTheme.tooltipBorder,
                            color: chartTheme.tooltipText,
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-legend">
                      {statusChartData.map((item) => (
                        <div key={item.statusKey} className="donut-legend-item">
                          <span
                            className="donut-legend-dot"
                            style={{
                              backgroundColor:
                                chartTheme.statusColors[item.statusKey] || chartTheme.barColor,
                            }}
                          ></span>
                          <span className="donut-legend-label">{item.name}:</span>
                          <strong className="donut-legend-count">{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chart 3: 30-Day Activity Trend (Full Width) */}
                <div className="chart-card chart-card-wide">
                  <h3 className="chart-title">Daily Activity Trend (Past 30 Days)</h3>
                  <p className="chart-subtitle">Daily count of citizen-reported issues</p>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={trendChartData}
                        margin={{ top: 10, right: 20, left: -20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} />
                        <XAxis
                          dataKey="displayDate"
                          tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                          minTickGap={25}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartTheme.tickFill }} />
                        <Tooltip
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: chartTheme.tooltipBg,
                            borderColor: chartTheme.tooltipBorder,
                            color: chartTheme.tooltipText,
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke={chartTheme.lineColor}
                          strokeWidth={2.5}
                          dot={{ r: 2.5, fill: chartTheme.lineColor }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* C. "Needs Attention" List: Top 5 Open Issues by Priority */}
          <section className="needs-attention-section" aria-labelledby="needs-attention-heading">
            <div className="section-header-row">
              <div>
                <h2 id="needs-attention-heading" className="section-heading-text">
                  🚨 Priority Issues Needing Attention
                </h2>
                <p className="section-heading-sub">
                  Top 5 highest priority open civic issues requiring urgent ward engineering action.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSortByPriority(true);
                  switchTab("issues");
                }}
                className="btn btn-outline btn-sm"
              >
                View All in Table →
              </button>
            </div>

            {loading ? (
              <Loader message="Assessing top priority issues..." minHeight="140px" />
            ) : needsAttentionIssues.length === 0 ? (
              <div className="attention-empty-card">
                <span>🎉</span> All reported issues are currently resolved!
              </div>
            ) : (
              <div className="needs-attention-grid">
                {needsAttentionIssues.map((issue, idx) => {
                  const catMeta = getCategoryMeta(issue.category);
                  return (
                    <div key={issue._id} className="attention-card">
                      <div className="attention-rank">#{idx + 1}</div>
                      <div className="attention-body">
                        <div className="attention-top-row">
                          <span
                            className="attention-category"
                            style={{
                              color: catMeta.color,
                              backgroundColor: `${catMeta.color}15`,
                            }}
                          >
                            {catMeta.icon} {catMeta.label}
                          </span>
                          <span className="priority-pill" title="Dynamic Priority Score">
                            ⚡ Score: {issue.priorityScore ?? 0}
                          </span>
                          <StatusBadge status={issue.status} />
                        </div>

                        <h4 className="attention-title">{issue.title}</h4>

                        {issue.address && (
                          <p className="attention-address">📍 {issue.address}</p>
                        )}

                        <div className="attention-footer">
                          <span className="attention-meta">
                            ▲ {issue.upvoteCount || 0} upvotes • Reported {formatDate(issue.createdAt)}
                          </span>
                          <Link to={`/issues/${issue._id}`} className="attention-link">
                            View Issue →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================
          TAB PANEL 2: MANAGE ISSUES (TABLE, STICKY FILTERS & PAGINATION)
          ======================================================== */}
      {activeTab === "issues" && (
        <div
          id="panel-issues"
          role="tabpanel"
          aria-labelledby="tab-btn-issues"
          className="admin-tab-panel"
        >
          {/* Sticky Filter Bar */}
          <div className="admin-sticky-filters-bar">
            {/* Search Input */}
            <div className="filter-group admin-search-group">
              <label htmlFor="admin-search-title">Search:</label>
              <div className="admin-search-input-wrap">
                <span className="search-icon" aria-hidden="true">🔍</span>
                <input
                  id="admin-search-title"
                  type="text"
                  placeholder="Filter by title..."
                  value={searchTitle}
                  onChange={(e) => {
                    setSearchTitle(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="admin-search-input"
                />
                {searchTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTitle("");
                      setCurrentPage(1);
                    }}
                    className="admin-search-clear"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <label htmlFor="admin-cat-filter">Category:</label>
              <select
                id="admin-cat-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label} {c.kannada ? `· ${c.kannada}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
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

            {/* Sort Toggle */}
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

            {/* Results Count Badge */}
            <div className="filter-count-badge">
              {totalFiltered} {totalFiltered === 1 ? "issue" : "issues"}
            </div>
          </div>

          {/* Issues Table Card with Desktop Table & Mobile Stacked Cards */}
          <div className="admin-table-card">
            {loading ? (
              <Loader message="Loading issue records..." minHeight="240px" />
            ) : totalFiltered === 0 ? (
              <EmptyState
                title="No issues found"
                message="No issue records match your current filter and search parameters."
                actionLabel={searchTitle || categoryFilter || statusFilter ? "Reset Filters" : undefined}
                onAction={() => {
                  setSearchTitle("");
                  setCategoryFilter("");
                  setStatusFilter("");
                  setSortByPriority(false);
                }}
              />
            ) : (
              <>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Title &amp; Location</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Reported By</th>
                        <th>Date</th>
                        <th>Workflow Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedIssues.map((issue) => {
                        const catMeta = getCategoryMeta(issue.category);
                        const nextStatus = NEXT_ALLOWED_STATUS[issue.status];
                        const actionLabel = nextStatus ? ACTION_BUTTON_LABELS[nextStatus] : null;
                        const isRowUpdating = updatingId === issue._id;

                        return (
                          <tr key={issue._id}>
                            {/* 1. Category */}
                            <td data-label="Category">
                              <span
                                className="issue-category-tag"
                                style={{
                                  borderColor: `${catMeta.color}40`,
                                  backgroundColor: `${catMeta.color}15`,
                                  fontSize: "0.78rem",
                                }}
                              >
                                {catMeta.icon} {catMeta.label}{" "}
                                <small style={{ opacity: 0.85 }}>· {catMeta.kannada}</small>
                              </span>
                            </td>

                            {/* 2. Title & Location */}
                            <td data-label="Title" className="table-title-cell">
                              <Link to={`/issues/${issue._id}`} className="table-title-link">
                                <strong>{issue.title}</strong>
                              </Link>
                              {issue.address && (
                                <small className="table-subtext">📍 {issue.address}</small>
                              )}
                            </td>

                            {/* 3. Status */}
                            <td data-label="Status">
                              <StatusBadge status={issue.status} />
                            </td>

                            {/* 4. Priority Score */}
                            <td data-label="Priority" className="table-priority-cell">
                              <span
                                className="priority-pill"
                                title="Dynamic priority score (Severity + Upvotes*2 + Age)"
                              >
                                ⚡ {issue.priorityScore ?? 0}
                              </span>
                            </td>

                            {/* 5. Reported By */}
                            <td data-label="Reported By">
                              {issue.reportedBy?.name || "Citizen"}
                            </td>

                            {/* 6. Date */}
                            <td data-label="Date" className="table-date-cell">
                              {formatDate(issue.createdAt)}
                            </td>

                            {/* 7. Workflow Action */}
                            <td data-label="Workflow Action" className="table-action-cell">
                              {nextStatus ? (
                                <div className="action-control-group">
                                  <input
                                    type="text"
                                    placeholder="Add inspection remark..."
                                    value={remarks[issue._id] || ""}
                                    onChange={(e) => handleRemarkChange(issue._id, e.target.value)}
                                    className="action-remark-input"
                                    disabled={isRowUpdating}
                                    maxLength={500}
                                    aria-label={`Remark for ${issue.title}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(issue._id, nextStatus)}
                                    className="btn btn-sm btn-action-next"
                                    disabled={isRowUpdating}
                                  >
                                    {isRowUpdating ? "Updating..." : actionLabel}
                                  </button>
                                </div>
                              ) : (
                                <span className="action-resolved-check" title="Issue is completed">
                                  ✓ Certified Resolved
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Client-Side Pagination Bar */}
                <div className="admin-pagination-bar" aria-label="Issue table pagination">
                  <div className="pagination-range-text">
                    Showing <strong>{startIdx + 1}</strong> to <strong>{endIdx}</strong> of{" "}
                    <strong>{totalFiltered}</strong> issues
                  </div>

                  <div className="pagination-actions">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={validPage <= 1}
                      className="btn btn-outline btn-sm pagination-btn"
                      aria-label="Previous page"
                    >
                      ← Previous
                    </button>

                    <span className="pagination-page-indicator">
                      Page {validPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={validPage >= totalPages}
                      className="btn btn-outline btn-sm pagination-btn"
                      aria-label="Next page"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
