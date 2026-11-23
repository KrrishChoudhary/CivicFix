// client/src/pages/Dashboard.jsx
// Citizen Dashboard: Visual hierarchy with Bengaluru header, computed metric cards,
// status & search filter toolbar, and responsive 4-step progress tracked issue grid.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import IssueCard from "../components/IssueCard";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import FilterCoffee from "../components/illustrations/FilterCoffee";
import AutoRickshaw from "../components/illustrations/AutoRickshaw";

const Dashboard = () => {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Toolbar state: status tab filter, sort criteria, search input
  const [statusTab, setStatusTab] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch logged-in user's reported issues (GET /api/issues/mine)
  useEffect(() => {
    let isMounted = true;
    const fetchMyIssues = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/issues/mine");
        if (isMounted) {
          setMyIssues(res.data.issues || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load your reported issues.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMyIssues();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Compute Stat Cards from client-side issue data
  const stats = useMemo(() => {
    const total = myIssues.length;
    const open = myIssues.filter((i) => i.status === "reported").length;
    const inProgress = myIssues.filter(
      (i) => i.status === "verified" || i.status === "in_progress"
    ).length;
    const resolved = myIssues.filter((i) => i.status === "resolved").length;
    const totalUpvotes = myIssues.reduce(
      (acc, curr) => acc + (curr.upvoteCount || 0),
      0
    );

    return { total, open, inProgress, resolved, totalUpvotes };
  }, [myIssues]);

  // Tab definitions with dynamic issue count badges
  const tabs = [
    { id: "all", label: "All Reports", count: stats.total },
    { id: "reported", label: "Open", count: stats.open },
    { id: "in_progress", label: "In Progress", count: stats.inProgress },
    { id: "resolved", label: "Resolved", count: stats.resolved },
  ];

  // 2. Filter & Sort Issues for the grid
  const filteredAndSortedIssues = useMemo(() => {
    let result = [...myIssues];

    // Status Tab filtering
    if (statusTab === "reported") {
      result = result.filter((i) => i.status === "reported");
    } else if (statusTab === "in_progress") {
      result = result.filter(
        (i) => i.status === "verified" || i.status === "in_progress"
      );
    } else if (statusTab === "resolved") {
      result = result.filter((i) => i.status === "resolved");
    }

    // Search query filtering by title
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((i) => (i.title || "").toLowerCase().includes(q));
    }

    // Sorting
    if (sortBy === "upvotes") {
      result.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    } else if (sortBy === "priority") {
      result.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    } else {
      // Default: "newest"
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [myIssues, statusTab, searchQuery, sortBy]);

  const resetFilters = () => {
    setStatusTab("all");
    setSearchQuery("");
    setSortBy("newest");
  };

  return (
    <div className="page-container dashboard-page-container">
      {/* 1. Header Card with Bengaluru Greeting, Role Badge & Report CTA */}
      <section className="dashboard-header-card" aria-labelledby="dash-greeting">
        <div className="dashboard-header-main">
          <div className="dash-greeting-row">
            <h1 id="dash-greeting" className="dashboard-greeting-title">
              Namaskara, {user?.name}!
            </h1>
            <span className={`badge badge-${user?.role || "citizen"}`}>
              {user?.role === "admin" ? "🛡️ Ward Admin" : "👤 Citizen"}
            </span>
          </div>

          <p className="dashboard-subtitle">
            Track, upvote, and monitor civic issue resolutions across Bengaluru wards.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Link
            to="/report"
            className="btn btn-primary btn-report-hero"
            title="Report a new civic issue in Bengaluru"
          >
            <AutoRickshaw width={38} height={26} className="btn-auto-svg" />
            <span>Report an Issue</span>
          </Link>
          <Link to="/map" className="btn btn-outline">
            🗺️ View Map
          </Link>
        </div>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 2. Stat Cards Row (Computed from GET /issues/mine) */}
      <section className="dashboard-stats-section" aria-label="Personal Civic Activity Summary">
        <div className="dashboard-stats-grid">
          {/* Stat 1: Total Reports */}
          <div className="dash-stat-card">
            <div className="dash-stat-icon-wrap stat-icon-total">📢</div>
            <div className="dash-stat-info">
              {loading ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="dash-stat-value">{stats.total}</div>
              )}
              <div className="dash-stat-label">Total Reports</div>
            </div>
          </div>

          {/* Stat 2: Open */}
          <div className="dash-stat-card">
            <div className="dash-stat-icon-wrap stat-icon-open">⏳</div>
            <div className="dash-stat-info">
              {loading ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="dash-stat-value">{stats.open}</div>
              )}
              <div className="dash-stat-label">Open / Reported</div>
            </div>
          </div>

          {/* Stat 3: In Progress */}
          <div className="dash-stat-card">
            <div className="dash-stat-icon-wrap stat-icon-progress">🛠️</div>
            <div className="dash-stat-info">
              {loading ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="dash-stat-value">{stats.inProgress}</div>
              )}
              <div className="dash-stat-label">In Progress</div>
            </div>
          </div>

          {/* Stat 4: Resolved */}
          <div className="dash-stat-card">
            <div className="dash-stat-icon-wrap stat-icon-resolved">✅</div>
            <div className="dash-stat-info">
              {loading ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="dash-stat-value">{stats.resolved}</div>
              )}
              <div className="dash-stat-label">Resolved</div>
            </div>
          </div>

          {/* Stat 5: Upvotes Received */}
          <div className="dash-stat-card">
            <div className="dash-stat-icon-wrap stat-icon-upvotes">▲</div>
            <div className="dash-stat-info">
              {loading ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="dash-stat-value">{stats.totalUpvotes}</div>
              )}
              <div className="dash-stat-label">Upvotes Received</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Toolbar: Status Tabs, Sort Dropdown & Search Box */}
      <section className="dashboard-toolbar-section">
        <div className="dashboard-toolbar">
          {/* Status Tabs */}
          <div className="dashboard-tabs" role="tablist" aria-label="Filter issues by status">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusTab === tab.id}
                className={`dash-tab-btn ${statusTab === tab.id ? "active" : ""}`}
                onClick={() => setStatusTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="dash-tab-count">
                  {loading ? "-" : tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Controls: Search and Sort */}
          <div className="dashboard-controls">
            {/* Search Input */}
            <div className="dash-search-box">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                placeholder="Search reports by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dash-search-input"
                aria-label="Search reports by title"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="dash-search-clear"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="dash-sort-box">
              <label htmlFor="dash-sort-select" className="sr-only">
                Sort reports
              </label>
              <select
                id="dash-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="dash-sort-select"
                aria-label="Sort reports"
              >
                <option value="newest">🕒 Newest First</option>
                <option value="upvotes">▲ Most Upvoted</option>
                <option value="priority">⚡ Highest Priority</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Responsive Grid of Issue Cards with 4-Step Tracker */}
      <section className="dashboard-issues-section" aria-label="Your Reported Civic Issues">
        {loading ? (
          <Loader message="Fetching your reported civic issues..." minHeight="240px" />
        ) : myIssues.length === 0 ? (
          /* Empty state when citizen has 0 reports overall */
          <EmptyState
            icon={<FilterCoffee width={64} height={64} />}
            title="No reports filed yet"
            message="Your street looks clean and pothole-free! Time for a hot filter coffee. If you notice an open drain or dark streetlight later, report it here."
            actionLabel="+ Report an Issue"
            actionTo="/report"
          />
        ) : filteredAndSortedIssues.length === 0 ? (
          /* Empty state when search or tab filter matches nothing */
          <EmptyState
            icon={<FilterCoffee width={56} height={56} />}
            title="No matching reports found"
            message={`No reports match your current search "${searchQuery}" or selected status filter.`}
            actionLabel="Reset Filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="citizen-issues-grid">
            {filteredAndSortedIssues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
