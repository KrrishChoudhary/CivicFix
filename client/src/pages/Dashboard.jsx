// client/src/pages/Dashboard.jsx
// Citizen Dashboard: Profile overview and list of reported issues

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import IssueCard from "../components/IssueCard";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import FilterCoffee from "../components/illustrations/FilterCoffee";

const Dashboard = () => {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch logged-in user's reported issues (GET /api/issues/mine)
  useEffect(() => {
    const fetchMyIssues = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/issues/mine");
        setMyIssues(res.data.issues || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your reported issues.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyIssues();
  }, []);

  return (
    <div className="page-container dashboard-page-container">
      {/* Header with profile overview */}
      <div className="dashboard-header-card">
        <div className="dashboard-header-main">
          <h1>ನಮಸ್ಕಾರ (Namaskara), {user?.name}!</h1>
          <p className="dashboard-subtitle">
            Role:{" "}
            <span className={`badge badge-${user?.role || "citizen"}`}>
              {user?.role}
            </span>{" "}
            • <span>{user?.email}</span>
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Link to="/report" className="btn btn-primary">
            + Report New Issue
          </Link>
          <Link to="/map" className="btn btn-outline">
            View Public Map
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* My Reported Issues Section */}
      <div className="dashboard-issues-section">
        <div className="section-header">
          <h2>My Reported Issues ({myIssues.length})</h2>
          <span className="section-help-text">
            Track the real-time status of civic issues you have reported.
          </span>
        </div>

        {loading ? (
          <Loader message="Fetching your reported civic issues..." minHeight="200px" />
        ) : myIssues.length === 0 ? (
          <EmptyState
            icon={<FilterCoffee width={64} height={64} />}
            title="No issues reported yet"
            message="Looks like your ward is in great shape! Time for a hot filter coffee. If you spot a pothole or dark streetlight later, report it here."
            actionLabel="+ Report Your First Issue"
            actionTo="/report"
          />
        ) : (
          <div className="issues-grid">
            {myIssues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
