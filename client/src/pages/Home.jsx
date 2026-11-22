// client/src/pages/Home.jsx
// Landing page for CivicFix - Bengaluru civic issue reporter

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="page-container">
      <div className="hero-card">
        <h1>Bengaluru Civic Issue Reporter</h1>
        <p className="hero-subtitle">
          Empowering citizens of Bengaluru to report potholes, garbage overflow, broken streetlights,
          and water leaks directly to authorities.
        </p>

        <div className="hero-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard ({user?.name})
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Get Started (Register)
              </Link>
              <Link to="/login" className="btn btn-outline">
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📍</div>
          <h3>Geo-Tagged Issues</h3>
          <p>Pinpoint civic issues with exact GPS coordinates across Bengaluru wards.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📸</div>
          <h3>Visual Evidence</h3>
          <p>Upload on-site photos powered by Cloudinary to speed up municipal verification.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔄</div>
          <h3>Transparent Workflow</h3>
          <p>Track progress from Reported to Verified, In Progress, and Resolved.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
