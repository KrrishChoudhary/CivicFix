// client/src/components/HeatmapLayer.jsx
// Renders an interactive Leaflet heatmap layer using leaflet.heat and react-leaflet useMap hook

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Viva Explanation:
 * Leaflet plugins (like leaflet.heat) traditionally expect a global `window.L`
 * reference to attach their factory methods or layer classes. In modern ES Module
 * bundlers like Vite, Leaflet is imported as an encapsulated module rather than a global
 * script tag. We explicitly assign `window.L = L` in the browser environment before
 * importing or utilizing `leaflet.heat` to ensure full cross-bundler compatibility.
 */
if (typeof window !== "undefined") {
  window.L = L;
}

// Import HeatLayer from leaflet.heat
import { HeatLayer } from "leaflet.heat";

// Ensure L.heatLayer factory function is available on L
if (!L.heatLayer) {
  L.heatLayer = (latlngs, options) => new HeatLayer(latlngs, options);
}

/**
 * HeatmapLayer Component
 *
 * @param {Array<[number, number, number]>} points - Array of [lat, lng, intensity] tuples
 * @param {Object} options - Heatmap configuration options (radius, blur, gradient, maxZoom, etc.)
 */
const HeatmapLayer = ({ points = [], options = {} }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Create and add the heatmap layer with a realistic multi-stop thermal gradient
    // Viva note: radius and blur define the spread of the Gaussian blur kernel for each point.
    // The gradient matches the UI legend: blue (cool, low priority) -> cyan -> green -> yellow -> fiery red (industrial hotspot).
    const heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 17,
      minOpacity: 0.25,
      gradient: {
        0.2: "#3b82f6",   // Calm Blue (low-priority / isolated residential report)
        0.4: "#06b6d4",   // Cyan (minor civic issue)
        0.6: "#10b981",   // Green (moderate urgency)
        0.75: "#eab308",  // Yellow / Amber (commercial cluster)
        0.9: "#f97316",   // Orange (high priority)
        1.0: "#ef4444",   // Fiery Red (massive industrial / traffic bottleneck hotspot)
      },
      ...options,
    });

    heatLayer.addTo(map);

    // Cleanup function: safely remove layer from map when unmounting or when points change
    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points, options]);

  return null; // Leaflet renders directly onto its canvas; no React DOM elements needed
};

export default HeatmapLayer;
