// client/src/pages/Dashboard.jsx
// Protected User Dashboard

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Welcome, {user?.name}!</h1>
        <p className="dashboard-subtitle">
          Logged in as:{" "}
          <span className={`badge badge-${user?.role || "citizen"}`}>
            {user?.role}
          </span>
        </p>

        <div className="dashboard-actions">
          <Link to="/report" className="btn btn-primary">
            + Report a Civic Issue
          </Link>
        </div>
      </div>

      <div className="dashboard-card">
        <h3>User Profile Overview</h3>
        <div className="user-details-list">
          <div className="detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">{user?.name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user?.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Role</span>
            <span className="detail-value capitalize">{user?.role}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">User ID</span>
            <span className="detail-value code">{user?._id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
