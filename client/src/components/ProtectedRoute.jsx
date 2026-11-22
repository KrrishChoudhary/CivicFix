// client/src/components/ProtectedRoute.jsx
// Protects routes that require authentication and optional admin authorization

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child component to render if authorized
 * @param {boolean} [props.adminOnly=false] - If true, requires user.role === "admin"
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Show loading indicator while verifying session with backend
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // 2. Redirect unauthenticated users to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If adminOnly is true, redirect non-admins to Home (/)
  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // 4. Authorized: render child component
  return children;
};

export default ProtectedRoute;
