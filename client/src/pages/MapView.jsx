// client/src/pages/MapView.jsx
// Public interactive Leaflet map displaying reported civic issues across Bengaluru
// Supports dual visualization modes: Individual Markers (Pins) and Hotspot Intensity (Heatmap)

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import { getMapTileConfig } from "../utils/mapTiles";
import StatusBadge from "../components/StatusBadge";
import HeatmapLayer from "../components/HeatmapLayer";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { CATEGORY_OPTIONS, getCategoryMeta } from "../utils/categoryMeta";

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
  const { theme } = useTheme();
  const tileConfig = getMapTileConfig(theme);

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  // Visualization mode toggle: "heatmap" (default hotspot layer) or "pins" (individual markers)
  const [viewMode, setViewMode] = useState("heatmap");

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
        {/* Visualization Toggle: Segmented Control [ Heatmap | Pins ] (Heatmap first & default) */}
        <div className="filter-group view-mode-filter-group">
          <label>View Mode:</label>
          <div className="segmented-control" role="group" aria-label="Map view mode">
            <button
              type="button"
              className={`segmented-btn ${viewMode === "heatmap" ? "active" : ""}`}
              onClick={() => setViewMode("heatmap")}
              aria-pressed={viewMode === "heatmap"}
            >
              🔥 Heatmap
            </button>
            <button
              type="button"
              className={`segmented-btn ${viewMode === "pins" ? "active" : ""}`}
              onClick={() => setViewMode("pins")}
              aria-pressed={viewMode === "pins"}
            >
              📍 Pins
            </button>
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
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label} {c.kannada ? `· ${c.kannada}` : ""}
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
            key={theme}
            attribution={tileConfig.attribution}
            url={tileConfig.url}
            className={tileConfig.className}
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
              const catMeta = getCategoryMeta(issue.category);

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
                        <span
                          className="popup-category"
                          style={{
                            color: catMeta.color,
                            borderColor: `${catMeta.color}40`,
                            backgroundColor: `${catMeta.color}15`,
                          }}
                        >
                          {catMeta.icon} {catMeta.label} · {catMeta.kannada}
                        </span>
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
            <span>Low (Blue)</span>
            <span>Minor (Cyan)</span>
            <span>Moderate (Lime)</span>
            <span>Medium (Yellow)</span>
            <span>High (Orange)</span>
            <span>Severe Hotspot (Red)</span>
          </div>
          <p className="heatmap-legend-text">
            Thermal spectrum ranges from cool blue (isolated low-priority reports) through cyan, lime,
            yellow, orange, to fiery red (heavy industrial clusters in Peenya and major traffic choke bottlenecks
            like Silk Board with high citizen upvotes). Resolved issues are excluded from the heatmap.
          </p>
        </div>
      )}

      {/* Empty State Message */}
      {!loading && (viewMode === "heatmap" ? heatmapPoints.length === 0 : issues.length === 0) && (
        <EmptyState
          title="No civic issues found"
          message="No active reports match your selected category or status filters. Time for a filter coffee, or reset your filters."
          actionLabel={category || status ? "Reset Filters" : undefined}
          onAction={
            category || status
              ? () => {
                  setCategory("");
                  setStatus("");
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default MapView;
