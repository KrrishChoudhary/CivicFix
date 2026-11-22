// client/src/components/LocationPicker.jsx
// Interactive Leaflet map component for selecting issue coordinates in Bengaluru

import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for Vite default marker icon bug:
// Leaflet dynamically resolves marker image assets using relative paths at runtime.
// Vite's build pipeline bundles and hashes these assets into /assets/, causing 404 broken icons.
// We import the static asset URLs directly and merge them into Leaflet's default icon settings.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Default center on Bengaluru (Vidhana Soudha area)
const BENGALURU_COORDINATES = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

/**
 * Child component that listens for click events on the Leaflet map
 */
const MapClickHandler = ({ onLocationPick }) => {
  useMapEvents({
    click(e) {
      onLocationPick({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
};

/**
 * LocationPicker Component
 * @param {Object} props
 * @param {Object|null} props.value - Selected coordinates { lat, lng }
 * @param {Function} props.onChange - Callback when location is selected/dragged
 */
const LocationPicker = ({ value, onChange }) => {
  const [geoError, setGeoError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef(null);

  // Handle marker dragend
  const handleMarkerDragEnd = (e) => {
    const latlng = e.target.getLatLng();
    onChange({
      lat: Number(latlng.lat.toFixed(6)),
      lng: Number(latlng.lng.toFixed(6)),
    });
  };

  // Use browser navigator.geolocation
  const handleUseCurrentLocation = () => {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser. Please click on the map manually.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        onChange(newCoords);
        setGettingLocation(false);

        // Pan and zoom map to current location
        if (mapRef.current) {
          mapRef.current.flyTo([newCoords.lat, newCoords.lng], 15);
        }
      },
      (error) => {
        setGettingLocation(false);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. You can still pick your location directly on the map.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable. Please pick a point on the map.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Please pick a point on the map.";
        }
        setGeoError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="location-picker-container">
      <div className="location-picker-header">
        <span className="location-picker-instructions">
          Click on the map or drag the marker to pinpoint the issue
        </span>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="btn btn-outline btn-sm btn-geo"
          disabled={gettingLocation}
        >
          {gettingLocation ? "Locating..." : "📍 Use my current location"}
        </button>
      </div>

      {geoError && <div className="alert alert-warning">{geoError}</div>}

      <div className="leaflet-map-wrapper">
        <MapContainer
          center={value ? [value.lat, value.lng] : BENGALURU_COORDINATES}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="leaflet-map"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onLocationPick={onChange} />

          {value && (
            <Marker
              position={[value.lat, value.lng]}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            >
              <Popup>
                <strong>Selected Location</strong>
                <br />
                Lat: {value.lat}, Lng: {value.lng}
                <br />
                <small>(Drag marker to adjust)</small>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="location-coordinates-display">
        {value ? (
          <span className="coords-badge coords-selected">
            ✓ Selected: Latitude {value.lat}, Longitude {value.lng}
          </span>
        ) : (
          <span className="coords-badge coords-empty">
            ⚠️ No location selected yet (Click on the map above)
          </span>
        )}
      </div>
    </div>
  );
};

export default LocationPicker;
