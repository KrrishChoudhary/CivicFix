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

    /**
     * Viva Explanation for Heatmap Configuration:
     * - radius (28): Pixel radius of Gaussian influence around each civic issue coordinate.
     * - blur (22): Gaussian blur standard deviation for smooth, rich thermal dissipation without pixelation.
     * - maxZoom (16): Peak intensity zoom level; setting to 16 ensures hotspot clusters maintain
     *   vibrant thermal presence when zooming into ward and street levels without washing out.
     * - minOpacity (0.25): Guarantees low-priority isolated issues remain clearly identifiable.
     * - gradient: Rich 6-stage thermal spectrum:
     *   Blue (0.2) -> Cyan (0.4) -> Lime (0.6) -> Yellow (0.75) -> Orange (0.88) -> Red (1.0).
     */
    const heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 16,
      minOpacity: 0.25,
      gradient: {
        0.2: "#0044ff",   // Blue (isolated, low-priority residential report)
        0.4: "#00d5ff",   // Cyan (minor civic issue)
        0.6: "#00e600",   // Lime (moderate urgency)
        0.75: "#ffea00",  // Yellow (commercial cluster / medium priority)
        0.88: "#ff6600",  // Orange (high priority / dense problem area)
        1.0: "#ff0000",   // Fiery Red (industrial disaster hotspot / heavy traffic bottleneck)
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
