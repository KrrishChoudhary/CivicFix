// client/src/context/AuthContext.jsx
// React Context for Global Authentication State Management

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

// 1. Create Context
const AuthContext = createContext(null);

/**
 * AuthProvider component to wrap the application and provide auth state
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  /**
   * On initial app load:
   * If a token exists in localStorage, verify it by calling GET /auth/me.
   * If valid, restore user profile; if invalid/expired, wipe token.
   */
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // GET /auth/me returns { user: { _id, name, email, role, ... } }
        const res = await api.get("/auth/me");
        setUser(res.data.user);
        setToken(storedToken);
      } catch (error) {
        console.error(
          "[AuthContext] Session restore failed:",
          error.response?.data?.message || error.message
        );
        // Clear invalid or expired credentials
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  /**
   * Register function
   * @param {Object} formData - { name, email, password }
   */
  const register = async ({ name, email, password }) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    // Save token to localStorage and update state
    localStorage.setItem("token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return res.data;
  };

  /**
   * Login function
   * @param {Object} credentials - { email, password }
   */
  const login = async ({ email, password }) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    // Save token to localStorage and update state
    localStorage.setItem("token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return res.data;
  };

  /**
   * Logout function
   * Clears token from localStorage and resets state
   */
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom Hook: useAuth
 * Convenient hook to consume AuthContext in any functional component
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
