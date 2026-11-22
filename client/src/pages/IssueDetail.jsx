// client/src/pages/IssueDetail.jsx
// Detailed view for a single civic issue with full details, image, map, and status history timeline

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import UpvoteButton from "../components/UpvoteButton";
import { useAuth } from "../context/AuthContext";

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

// Helper for formatted dates
const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const IssueDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchIssueAndHistory = async () => {
      setLoading(true);
      setNotFound(false);
      setError("");

      try {
        // Parallel requests for issue details and status update timeline
        const [issueRes, historyRes] = await Promise.all([
          api.get(`/issues/${id}`),
          api.get(`/issues/${id}/history`),
        ]);

        setIssue(issueRes.data.issue);
        setHistory(historyRes.data.history || []);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.message || "Failed to load issue details.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchIssueAndHistory();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-container not-found-container">
        <h2>Issue Not Found</h2>
        <p>The civic issue you are looking for does not exist or may have been removed.</p>
        <Link to="/map" className="btn btn-primary">
          Back to Public Map
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-danger">{error}</div>
        <Link to="/map" className="btn btn-outline">
          Back to Map
        </Link>
      </div>
    );
  }

  if (!issue) return null;

  // MongoDB location coordinates: [longitude, latitude] -> Leaflet: [latitude, longitude]
  const coords = issue.location?.coordinates;
  const position = coords && coords.length === 2 ? [coords[1], coords[0]] : null;

  // Determine permissions for current user
  const reportedById = issue.reportedBy?._id || issue.reportedBy;
  const isOwnIssue = !!(
    user &&
    reportedById &&
    reportedById.toString() === user._id?.toString()
  );
  const isResolved = issue.status === "resolved";

  return (
    <div className="page-container issue-detail-container">
      {/* Back button */}
      <div className="detail-nav-back">
        <Link to="/map" className="back-link">
          ← Back to Map
        </Link>
      </div>

      <div className="issue-detail-header-card">
        <div className="detail-tags-row">
          <div className="detail-tags-left">
            <span className="issue-category-tag">{issue.category}</span>
            <StatusBadge status={issue.status} />
            <span
              className="priority-badge"
              title="Dynamic priority score calculated from category severity weight, community upvotes, and issue age"
            >
              ⚡ Priority Score: {issue.priorityScore ?? 0}
            </span>
          </div>

          <div className="detail-header-upvote">
            <UpvoteButton
              issueId={issue._id}
              initialCount={issue.upvoteCount}
              initialUpvoted={issue.hasUpvoted}
              isOwnIssue={isOwnIssue}
              isResolved={isResolved}
              size="lg"
              onUpvoteChange={(newUpvoted, newCount) => {
                setIssue((prev) => {
                  if (!prev) return prev;
                  // Dynamic adjustment: upvote adds 2 points (or 0 if resolved)
                  const delta = newUpvoted ? 2 : -2;
                  const newScore =
                    prev.status === "resolved"
                      ? 0
                      : Math.max(0, (prev.priorityScore ?? 0) + delta);
                  return {
                    ...prev,
                    upvoteCount: newCount,
                    hasUpvoted: newUpvoted,
                    priorityScore: newScore,
                  };
                });
              }}
            />
          </div>
        </div>

        <h1 className="detail-title">{issue.title}</h1>

        <div className="detail-meta-row">
          <span>Reported by: <strong>{issue.reportedBy?.name || "Citizen"}</strong></span>
          <span>•</span>
          <span>{formatDateTime(issue.createdAt)}</span>
          {issue.address && (
            <>
              <span>•</span>
              <span>📍 {issue.address}</span>
            </>
          )}
        </div>
      </div>

      <div className="issue-detail-grid">
        {/* Left Column: Description & Photo Evidence */}
        <div className="detail-main-column">
          <div className="detail-card">
            <h3>Description</h3>
            <p className="detail-description">{issue.description}</p>
          </div>

          {issue.imageUrl && (
            <div className="detail-card">
              <h3>Photo Evidence</h3>
              <div className="detail-image-wrapper">
                <img src={issue.imageUrl} alt={issue.title} className="detail-large-image" />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Mini Map & Status History Timeline */}
        <div className="detail-side-column">
          {/* Mini Map */}
          {position && (
            <div className="detail-card">
              <h3>Location on Map</h3>
              <div className="detail-mini-map-wrapper">
                <MapContainer
                  center={position}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="detail-mini-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={position}>
                    <Popup>
                      <strong>{issue.title}</strong>
                      <br />
                      Lat: {position[0]}, Lng: {position[1]}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              <p className="detail-coords-text">
                Coordinates: {position[0]}, {position[1]}
              </p>
            </div>
          )}

          {/* Status Update History Timeline */}
          <div className="detail-card">
            <h3>Workflow History</h3>
            {history.length === 0 ? (
              <p className="text-muted">No history updates recorded.</p>
            ) : (
              <div className="timeline">
                {history.map((item, index) => (
                  <div key={item._id || index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <StatusBadge status={item.status} />
                        <span className="timeline-date">{formatDateTime(item.createdAt)}</span>
                      </div>
                      {item.remark && (
                        <p className="timeline-remark">"{item.remark}"</p>
                      )}
                      <p className="timeline-author">
                        By: <strong>{item.updatedBy?.name || "Official"}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;
