// client/src/components/Navbar.jsx
// Top navigation bar for CivicFix with React Router NavLink active indicators, user dropdown menu, mobile slide-down panel, and ThemeSwitcher

import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "./ThemeSwitcher";

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navbarRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close open dropdowns/panels on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key and click outside for dropdowns
  useEffect(() => {
    if (!userMenuOpen && !mobileMenuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (mobileMenuOpen && navbarRef.current && !navbarRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen, mobileMenuOpen]);

  const firstInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

  return (
    <nav className="navbar" aria-label="Main Navigation" ref={navbarRef}>
      <div className="nav-container">
        {/* LEFT ZONE: Brand */}
        <div className="nav-zone-left">
          <Link to="/" className="nav-logo" aria-label="CivicFix Home">
            Civic<span>Fix</span>
          </Link>
        </div>

        {/* MIDDLE ZONE: Nav Links (Desktop) */}
        <div className="nav-zone-middle">
          <NavLink to="/" end className="nav-item">
            Home
          </NavLink>

          <NavLink to="/map" className="nav-item">
            Map
          </NavLink>

          {isAuthenticated && (
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
            </>
          )}
        </div>

        {/* RIGHT ZONE: Theme Switcher & User Menu / Auth Controls */}
        <div className="nav-zone-right">
          <div className="nav-desktop-controls">
            <ThemeSwitcher />

            {isAuthenticated ? (
              <div className="nav-user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="nav-user-avatar-btn"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                  aria-label="User menu"
                >
                  {firstInitial}
                </button>

                {userMenuOpen && (
                  <div className="nav-user-dropdown" role="menu">
                    <div className="nav-user-dropdown-header">
                      <div className="nav-user-dropdown-name">{user?.name}</div>
                      {user?.email && (
                        <div className="nav-user-dropdown-email">{user.email}</div>
                      )}
                    </div>

                    <NavLink
                      to="/dashboard"
                      role="menuitem"
                      className="nav-user-dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Dashboard
                    </NavLink>

                    <button
                      type="button"
                      role="menuitem"
                      className="nav-user-dropdown-item nav-user-dropdown-logout"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav-auth-buttons">
                <NavLink to="/login" className="nav-item">
                  Login
                </NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm nav-register-btn">
                  Register
                </NavLink>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="nav-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-haspopup="true"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-panel"
          >
            {mobileMenuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-DOWN PANEL (Under 768px) */}
      {mobileMenuOpen && (
        <div id="mobile-nav-panel" className="nav-mobile-panel" aria-label="Mobile Navigation">
          <div className="nav-mobile-links">
            <NavLink
              to="/"
              end
              className="nav-mobile-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </NavLink>

            <NavLink
              to="/map"
              className="nav-mobile-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              Map
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink
                  to="/report"
                  className="nav-mobile-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Report Issue
                </NavLink>

                <NavLink
                  to="/dashboard"
                  className="nav-mobile-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </NavLink>

                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className="nav-mobile-item nav-admin-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </NavLink>
                )}
              </>
            )}
          </div>

          {/* Theme switcher and user section at the bottom of the mobile panel */}
          <div className="nav-mobile-bottom">
            <div className="nav-mobile-theme">
              <span className="nav-mobile-theme-label">Theme</span>
              <ThemeSwitcher id="mobile-theme-switcher-select" />
            </div>

            <div className="nav-mobile-user">
              {isAuthenticated ? (
                <div className="nav-mobile-user-row">
                  <div className="nav-mobile-user-info">
                    <div className="nav-user-avatar-circle">{firstInitial}</div>
                    <span className="nav-mobile-user-name">{user?.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="nav-mobile-auth-row">
                  <NavLink
                    to="/login"
                    className="btn btn-outline btn-sm mobile-auth-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="btn btn-primary btn-sm mobile-auth-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
