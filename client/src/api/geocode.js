// client/src/api/geocode.js
// OpenStreetMap Nominatim Geocoding & Reverse Geocoding service for Bengaluru

/**
 * OpenStreetMap Nominatim Usage Policy Compliance:
 * 1. NO search-as-you-type autocomplete. Search only on Enter or button click.
 * 2. Absolute rate limit: Maximum 1 request per second.
 * 3. Bounded viewbox: Limits geocoding to Bengaluru Urban metropolitan area.
 */

let lastRequestTime = 0;
const RATE_LIMIT_MS = 1000; // 1 second throttle

/**
 * Throttle helper to ensure we never exceed 1 request per second to Nominatim
 */
const throttleNominatim = async () => {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
};

/**
 * Search places within the Bengaluru bounding box
 *
 * @param {string} query - Place name or landmark (e.g. "Koramangala", "Indiranagar")
 * @returns {Promise<Array<{ label: string, lat: number, lng: number }>>}
 */
export const searchPlaces = async (query) => {
  if (!query || typeof query !== "string" || !query.trim()) {
    return [];
  }

  await throttleNominatim();

  // Nominatim viewbox for Bengaluru: 77.35,13.20,77.85,12.80 (minLon, maxLat, maxLon, minLat)
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    query.trim()
  )}&countrycodes=in&viewbox=77.35,13.20,77.85,12.80&bounded=1&limit=5`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("[Nominatim Search] Non-200 HTTP status:", response.status);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    // Map into clean objects with numeric lat and lng
    return data.map((item) => ({
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.warn("[Nominatim Search Error]:", error.message);
    return [];
  }
};

/**
 * Reverse geocode latitude and longitude into a readable address string
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string|null>} - Short readable address or null on failure
 */
export const reverseGeocode = async (lat, lng) => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return null;
  }

  await throttleNominatim();

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("[Nominatim Reverse] Non-200 HTTP status:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data || !data.address) {
      return data?.display_name || null;
    }

    // Format into a clean, concise address for the form field
    const addr = data.address;
    const parts = [
      addr.amenity || addr.building || addr.shop || addr.office,
      addr.road || addr.street || addr.pedestrian,
      addr.suburb || addr.neighbourhood || addr.quarter,
      addr.city || addr.city_district || "Bengaluru",
      addr.postcode,
    ].filter(Boolean);

    if (parts.length >= 2) {
      return parts.join(", ");
    }

    return data.display_name || null;
  } catch (error) {
    console.warn("[Nominatim Reverse Error]:", error.message);
    return null;
  }
};
