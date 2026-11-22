// client/src/pages/MapView.jsx
// Public interactive Leaflet map displaying reported civic issues across Bengaluru
// Supports dual visualization modes: Individual Markers (Pins) and Hotspot Intensity (Heatmap)

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import HeatmapLayer from "../components/HeatmapLayer";

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

  // Visualization mode toggle: "pins" (default individual markers) or "heatmap" (density/priority layer)
  const [viewMode, setViewMode] = useState("pins");

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

  /**
   * Viva Explanation for Heatmap Intensity Calculation:
   * 1. Exclude Resolved: Civic hotspot maps help municipal staff prioritize active work,
   *    so resolved issues are omitted from the heatmap.
   * 2. Coordinate Conversion: MongoDB GeoJSON coordinates are [longitude, latitude].
   *    Leaflet requires [latitude, longitude].
   * 3. Normalized Intensity: Calculated as (issue.priorityScore / maxPriorityScore).
   * 4. Minimum Intensity Clamping: A minimum threshold of 0.2 ensures even low-priority
   *    or newly reported issues remain visible as faint thermal spots.
   */
  const heatmapIssues = issues.filter((issue) => issue.status !== "resolved");

  const maxPriority = Math.max(
    1,
    ...heatmapIssues.map((issue) => issue.priorityScore || 0)
  );

  const heatmapPoints = heatmapIssues
    .filter(
      (issue) =>
        issue.location?.coordinates &&
        Array.isArray(issue.location.coordinates) &&
        issue.location.coordinates.length === 2
    )
    .map((issue) => {
      const [lng, lat] = issue.location.coordinates;
      const score = issue.priorityScore || 0;
      const calculatedIntensity = score / maxPriority;
      // Clamp intensity between 0.2 (minimum visibility) and 1.0 (maximum heat)
      const intensity = Math.max(0.2, Math.min(1.0, calculatedIntensity));
      return [lat, lng, Number(intensity.toFixed(2))];
    });

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

      {/* Filter and View Mode Controls Bar */}
      <div className="map-filters-bar">
        {/* Visualization Toggle: Pins vs Heatmap */}
        <div className="filter-group view-mode-filter-group">
          <label>View Mode:</label>
          <div className="map-view-toggle">
            <label className={`view-toggle-option ${viewMode === "pins" ? "active" : ""}`}>
              <input
                type="radio"
                name="viewMode"
                value="pins"
                checked={viewMode === "pins"}
                onChange={(e) => setViewMode(e.target.value)}
              />
              <span>📍 Pins</span>
            </label>
            <label className={`view-toggle-option ${viewMode === "heatmap" ? "active" : ""}`}>
              <input
                type="radio"
                name="viewMode"
                value="heatmap"
                checked={viewMode === "heatmap"}
                onChange={(e) => setViewMode(e.target.value)}
              />
              <span>🔥 Heatmap</span>
            </label>
          </div>
        </div>

        {/* Category Filter */}
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

        {/* Status Filter */}
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
          {loading
            ? "Loading..."
            : viewMode === "heatmap"
            ? `${heatmapPoints.length} active hotspot ${heatmapPoints.length === 1 ? "point" : "points"}`
            : `${issues.length} ${issues.length === 1 ? "issue" : "issues"} found`}
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

          {/* Conditional rendering based on active view mode */}
          {viewMode === "heatmap" ? (
            <HeatmapLayer points={heatmapPoints} />
          ) : (
            issues.map((issue) => {
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

                      <div className="popup-footer-row">
                        <span className="popup-priority">
                          ⚡ Priority: {issue.priorityScore ?? 0}
                        </span>
                        <Link to={`/issues/${issue._id}`} className="popup-link">
                          Details →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })
          )}
        </MapContainer>
      </div>

      {/* Heatmap Legend (shown only in Heatmap view mode) */}
      {viewMode === "heatmap" && (
        <div className="heatmap-legend-card">
          <div className="heatmap-legend-header">
            <span className="heatmap-legend-icon">🔥</span>
            <strong>Civic Hotspot Intensity Legend</strong>
          </div>
          <div className="heatmap-gradient-bar"></div>
          <div className="heatmap-gradient-labels">
            <span>Low Priority / Residential (0.2)</span>
            <span>Commercial / Moderate</span>
            <span>Industrial & Choke Hotspots (1.0)</span>
          </div>
          <p className="heatmap-legend-text">
            Brighter, warmer areas (amber and fiery red) indicate heavy concentrations of high-priority
            unresolved civic issues (such as heavy truck craters in Peenya Industrial Area or severe
            drainage choke points at Silk Board with multiple citizen upvotes). Calm blue spots denote
            isolated, low-priority residential reports. Resolved issues are excluded.
          </p>
        </div>
      )}

      {/* Empty State Message */}
      {!loading && (viewMode === "heatmap" ? heatmapPoints.length === 0 : issues.length === 0) && (
        <div className="empty-state-card">
          <p>📍 No active civic issues found matching the selected filters.</p>
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
