// client/src/api/axios.js
// Centralized Axios instance with base URL and automatic JWT authorization header

import axios from "axios";

/**
 * Create Axios instance with base API URL from environment variable
 * Defaults to http://localhost:5000/api if not specified
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor
 * Automatically injects the JWT token from localStorage into the Authorization header
 * for all outgoing HTTP requests.
 *
 * Viva Explanation:
 * Instead of manually attaching headers in every component or API call,
 * an Axios interceptor centralizes token attachment. Whenever a request is made,
 * it checks localStorage. If a token exists, it sets `Authorization: Bearer <token>`.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
