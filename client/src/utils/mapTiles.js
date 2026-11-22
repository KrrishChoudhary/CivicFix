// client/src/utils/mapTiles.js
// Provides reliable, zero-API-key Leaflet map tile configurations for all themes
// Uses OpenStreetMap tiles with CSS dark filtering for dark theme to avoid third-party API key restrictions

export const getMapTileConfig = (theme) => {
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    className: theme === "dark" ? "map-tiles-dark" : "",
  };
};
