// client/src/pages/ReportIssue.jsx
// Form to report a civic issue with Leaflet map location picker, duplicate detection, and image upload

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { reverseGeocode } from "../api/geocode";
import LocationPicker from "../components/LocationPicker";
import StatusBadge from "../components/StatusBadge";
import { REPORT_CATEGORY_OPTIONS, getCategoryMeta } from "../utils/categoryMeta";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ReportIssue = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("pothole");
  const [address, setAddress] = useState("");
  const [isAddressManuallyEdited, setIsAddressManuallyEdited] = useState(false);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);
  const [location, setLocation] = useState(null); // { lat, lng }

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Duplicate detection state: stores open nearby issues within 50m
  const [nearbyIssues, setNearbyIssues] = useState([]);

  // Automatic Reverse Geocoding: whenever location changes, populate address unless manually edited
  useEffect(() => {
    if (!location || location.lat === undefined || location.lng === undefined) {
      return;
    }

    // Do not overwrite if user has manually typed in the address field
    if (isAddressManuallyEdited) {
      return;
    }

    let isMounted = true;
    const lookupAddress = async () => {
      setIsLookingUpAddress(true);
      try {
        const detectedAddress = await reverseGeocode(location.lat, location.lng);
        if (isMounted && detectedAddress && !isAddressManuallyEdited) {
          setAddress(detectedAddress);
        }
      } catch (err) {
        console.warn("[Reverse Geocode Warning]:", err.message);
      } finally {
        if (isMounted) {
          setIsLookingUpAddress(false);
        }
      }
    };

    lookupAddress();

    return () => {
      isMounted = false;
    };
  }, [location, isAddressManuallyEdited]);

  // Duplicate detection query: calls GET /api/issues/nearby when location and category change
  useEffect(() => {
    if (!location || location.lat === undefined || location.lng === undefined || !category) {
      setNearbyIssues([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/issues/nearby", {
          params: {
            latitude: location.lat,
            longitude: location.lng,
            category,
            radius: 50, // 50 meters
          },
        });
        if (isMounted) {
          setNearbyIssues(res.data.issues || []);
        }
      } catch (err) {
        // Fail silently without crashing the form
        console.warn("[Duplicate Detection]:", err.message);
        if (isMounted) {
          setNearbyIssues([]);
        }
      }
    }, 400); // 400ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [location, category]);

  // Handle image file selection with client-side validation
  const handleImageChange = (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    // 1. Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a valid image file (JPEG, PNG, or WebP).");
      e.target.value = "";
      return;
    }

    // 2. Validate file size (under 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      setError("Image file size must be under 5 MB.");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 1. Client-side validation
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (title.trim().length > 100) {
      setError("Title cannot exceed 100 characters.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (description.trim().length > 1000) {
      setError("Description cannot exceed 1000 characters.");
      return;
    }

    if (!location || location.lat === undefined || location.lng === undefined) {
      setError("Please pick a location on the map.");
      return;
    }

    setSubmitting(true);

    try {
      // 2. Construct FormData (multipart/form-data)
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("latitude", location.lat);
      formData.append("longitude", location.lng);

      if (address.trim()) {
        formData.append("address", address.trim());
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      // 3. Send POST request using centralized Axios instance
      // Note: Do not set Content-Type header manually; Axios and browser will supply the correct boundary
      await api.post("/issues", formData);

      setSuccess(
        "ಧನ್ಯವಾದಗಳು (Dhanyavadagalu — Thank You)! Your civic report has been submitted to BBMP authorities. Redirecting to your dashboard..."
      );

      // Short delay so user sees success message before redirect
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to submit issue. Please check your network and try again.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="report-card">
        <div className="report-header">
          <h2>Report a Civic Issue</h2>
          <p className="report-subtitle">
            Help BBMP and civic authorities locate and address infrastructure issues in your neighborhood.
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="report-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Issue Title *</label>
            <input
              id="title"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Deep pothole on 100ft road near signal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            <small className="form-help">{title.length}/100 characters</small>
          </div>

          {/* Category */}
          <div className="form-group">
            <div className="label-with-kannada-row">
              <label htmlFor="category">Category *</label>
              <span className="kannada-field-label">ವರ್ಗ: {getCategoryMeta(category).kannada}</span>
            </div>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {REPORT_CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label} · {cat.kannada}
                </option>
              ))}
            </select>
            <small className="form-help category-kannada-hint">
              <strong>{getCategoryMeta(category).kannada} ({getCategoryMeta(category).kannadaTranslit})</strong> — {getCategoryMeta(category).description}
            </small>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Detailed Description *</label>
            <textarea
              id="description"
              rows={4}
              required
              maxLength={1000}
              placeholder="Describe the severity, nearby landmarks, or hazards caused by this issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
            <small className="form-help">{description.length}/1000 characters</small>
          </div>

          {/* Optional Address (Auto-filled by reverse geocoding, stays editable) */}
          <div className="form-group">
            <div className="label-with-hint">
              <label htmlFor="address">Landmark / Street Address (Optional)</label>
              {isLookingUpAddress && (
                <span className="address-lookup-hint">📍 Looking up address...</span>
              )}
            </div>
            <input
              id="address"
              type="text"
              placeholder="e.g. Opposite Sony World, 4th Block, Koramangala"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setIsAddressManuallyEdited(true); // User manually edited address; stop auto-overwrite
              }}
              disabled={submitting}
            />
            <small className="form-help">
              {isAddressManuallyEdited
                ? "Manually edited address."
                : "Automatically filled from selected map location (editable)."}
            </small>
          </div>

          {/* Image Upload with Preview */}
          <div className="form-group">
            <label htmlFor="image">Photo Evidence (Optional, max 5 MB)</label>
            <input
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={submitting}
            />
            <small className="form-help">Accepted formats: JPG, PNG, WebP</small>

            {imagePreview && (
              <div className="image-preview-wrapper">
                <img src={imagePreview} alt="Issue preview" className="image-preview-thumb" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="btn btn-outline btn-sm btn-remove-image"
                  disabled={submitting}
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          {/* Location Picker Map */}
          <div className="form-group">
            <label>Location on Map *</label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          {/* Duplicate Detection Warning Banner */}
          {nearbyIssues.length > 0 && (
            <div className="nearby-warning-card">
              <div className="nearby-warning-header">
                <span className="nearby-warning-icon">⚠️</span>
                <h4>Similar open issues were reported within 50 m</h4>
              </div>
              <p className="nearby-warning-subtext">
                Please review existing reports to check if this has already been submitted:
              </p>
              <ul className="nearby-issues-list">
                {nearbyIssues.map((item) => (
                  <li key={item._id} className="nearby-issue-item">
                    <div className="nearby-issue-info">
                      <span className="nearby-issue-title">{item.title}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <Link
                      to={`/issues/${item._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nearby-issue-link"
                    >
                      View Issue ↗
                    </Link>
                  </li>
                ))}
              </ul>
              <small className="nearby-warning-note">
                You can still submit your report if this is a separate or new issue.
              </small>
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={submitting}
            >
              {submitting ? "Submitting Issue..." : "Submit Civic Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIssue;
