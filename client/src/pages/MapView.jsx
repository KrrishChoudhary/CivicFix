// client/src/pages/MapView.jsx
// Public interactive Leaflet map displaying all reported civic issues in Bengaluru

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";

// Fix for Vite default marker icon bug
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const BENGALURU_CENTER = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "pothole", label: "Pothole" },
  { value: "garbage", label: "Garbage" },
  { value: "streetlight", label: "Streetlight" },
  { value: "water_leak", label: "Water Leak" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "reported", label: "Reported" },
  { value: "verified", label: "Verified" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const MapView = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  // Fetch issues with optional category and status query filters
  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (category) params.category = category;
        if (status) params.status = status;

        const res = await api.get("/issues", { params });
        setIssues(res.data.issues || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load civic issues on the map.");
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [category, status]);

  return (
    <div className="page-container map-page-container">
      <div className="map-page-header">
        <div>
          <h1>Bengaluru Civic Issues Map</h1>
          <p className="map-page-subtitle">
            Explore active, in-progress, and resolved infrastructure reports across Bengaluru wards.
          </p>
        </div>

        <Link to="/report" className="btn btn-primary btn-sm">
          + Report an Issue
        </Link>
      </div>

      {/* Filter Controls Bar */}
      <div className="map-filters-bar">
        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-count-badge">
          {loading ? "Loading..." : `${issues.length} ${issues.length === 1 ? "issue" : "issues"} found`}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Map Container with explicit fixed height */}
      <div className="public-map-wrapper">
        <MapContainer
          center={BENGALURU_CENTER}
          zoom={DEFAULT_ZOOM}
          className="public-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {issues.map((issue) => {
            // MongoDB coordinates are [longitude, latitude] -> Leaflet requires [latitude, longitude]
            const coords = issue.location?.coordinates;
            if (!coords || coords.length !== 2) return null;
            const position = [coords[1], coords[0]];

            return (
              <Marker key={issue._id} position={position}>
                <Popup className="map-popup">
                  <div className="popup-content">
                    {issue.imageUrl && (
                      <img
                        src={issue.imageUrl}
                        alt={issue.title}
                        className="popup-thumbnail"
                      />
                    )}

                    <div className="popup-tags">
                      <span className="popup-category">{issue.category}</span>
                      <StatusBadge status={issue.status} />
                    </div>

                    <h4 className="popup-title">{issue.title}</h4>

                    {issue.address && (
                      <p className="popup-address">📍 {issue.address}</p>
                    )}

                    <Link to={`/issues/${issue._id}`} className="popup-link">
                      View Full Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Empty State Message */}
      {!loading && issues.length === 0 && (
        <div className="empty-state-card">
          <p>📍 No civic issues found matching the selected filters.</p>
          {(category || status) && (
            <button
              onClick={() => {
                setCategory("");
                setStatus("");
              }}
              className="btn btn-outline btn-sm"
              style={{ marginTop: "0.5rem" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;
