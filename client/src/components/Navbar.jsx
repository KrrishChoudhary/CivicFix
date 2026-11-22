// client/src/components/Navbar.jsx
// Top navigation bar for CivicFix

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Civic<span>Fix</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-item">
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-item">
                Dashboard
              </Link>

              {isAdmin && (
                <span className="nav-admin-badge" title="Administrator">
                  Admin
                </span>
              )}

              <span className="nav-user-greeting">
                Hello, <strong>{user?.name}</strong>
              </span>

              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-item">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
