// client/src/components/Navbar.jsx
// Top navigation bar for CivicFix with React Router NavLink active indicators and ThemeSwitcher

import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "./ThemeSwitcher";

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Civic<span>Fix</span>
        </Link>

        <div className="nav-links">
          {/* Home NavLink with 'end' prop so it does not match every nested route */}
          <NavLink to="/" end className="nav-item">
            Home
          </NavLink>

          <NavLink to="/map" className="nav-item">
            Map
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/report" className="nav-item">
                Report Issue
              </NavLink>

              <NavLink to="/dashboard" className="nav-item">
                Dashboard
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" className="nav-item nav-admin-link">
                  Admin
                </NavLink>
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
              <NavLink to="/login" className="nav-item">
                Login
              </NavLink>
              <NavLink to="/register" className="nav-item nav-register-btn">
                Register
              </NavLink>
            </>
          )}

          {/* Compact visual theme switcher */}
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
