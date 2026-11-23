// client/src/utils/categoryMeta.js
// Shared category metadata helper providing consistent icons, colors, English labels,
// and authentic Kannada translations across IssueCard, Report Form, Map Popups, and Filters.

export const CATEGORY_MAP = {
  pothole: {
    id: "pothole",
    label: "Pothole",
    kannada: "ಗುಂಡಿ",
    kannadaTranslit: "Gundi",
    icon: "🕳️",
    color: "#ea580c",
    badgeClass: "badge-cat-pothole",
    description: "Road damage, asphalt craters, loose gravel",
  },
  garbage: {
    id: "garbage",
    label: "Garbage",
    kannada: "ಕಸ",
    kannadaTranslit: "Kasa",
    icon: "🗑️",
    color: "#16a34a",
    badgeClass: "badge-cat-garbage",
    description: "Overflowing bins, uncollected waste, illegal dump",
  },
  streetlight: {
    id: "streetlight",
    label: "Streetlight",
    kannada: "ಬೀದಿ ದೀಪ",
    kannadaTranslit: "Beedi Deepa",
    icon: "💡",
    color: "#eab308",
    badgeClass: "badge-cat-streetlight",
    description: "Dark streetlamps, flickering bulbs, open wiring",
  },
  water_leak: {
    id: "water_leak",
    label: "Water Leak",
    kannada: "ನೀರು ಸೋರಿಕೆ",
    kannadaTranslit: "Neeru Sorike",
    icon: "💧",
    color: "#0284c7",
    badgeClass: "badge-cat-water_leak",
    description: "BWSSB pipeline burst, overflowing valve, runoff",
  },
  other: {
    id: "other",
    label: "Other",
    kannada: "ಇತರೆ",
    kannadaTranslit: "Ithare",
    icon: "⚠️",
    color: "#8b5cf6",
    badgeClass: "badge-cat-other",
    description: "Broken drain slabs, low-hanging cables, tree falls",
  },
};

/**
 * Returns full metadata for a category slug with safe fallback
 */
export const getCategoryMeta = (category) => {
  if (!category) {
    return {
      id: "unknown",
      label: "Unknown",
      kannada: "ಅಜ್ಞಾತ",
      kannadaTranslit: "Ajnata",
      icon: "📌",
      color: "var(--text-muted)",
      badgeClass: "badge-cat-other",
      description: "Civic issue",
    };
  }

  const normalized = String(category).toLowerCase().trim();
  return (
    CATEGORY_MAP[normalized] || {
      id: normalized,
      label: normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, " "),
      kannada: "ಇತರೆ",
      kannadaTranslit: "Ithare",
      icon: "📌",
      color: "var(--text-muted)",
      badgeClass: "badge-cat-other",
      description: "Civic issue",
    }
  );
};

/**
 * Formats category with Kannada subtitle, e.g. "Pothole · ಗುಂಡಿ"
 */
export const formatCategoryWithKannada = (category) => {
  const meta = getCategoryMeta(category);
  return `${meta.label} · ${meta.kannada}`;
};

/**
 * Standard list of category options for filters and select dropdowns
 */
export const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories", kannada: "ಎಲ್ಲಾ ವರ್ಗಗಳು", icon: "🏙️" },
  { value: "pothole", label: "Pothole", kannada: "ಗುಂಡಿ", icon: "🕳️" },
  { value: "garbage", label: "Garbage", kannada: "ಕಸ", icon: "🗑️" },
  { value: "streetlight", label: "Streetlight", kannada: "ಬೀದಿ ದೀಪ", icon: "💡" },
  { value: "water_leak", label: "Water Leak", kannada: "ನೀರು ಸೋರಿಕೆ", icon: "💧" },
  { value: "other", label: "Other", kannada: "ಇತರೆ", icon: "⚠️" },
];

/**
 * List for the Report Issue form select dropdown
 */
export const REPORT_CATEGORY_OPTIONS = [
  { value: "pothole", label: "Pothole (Road Damage)", kannada: "ಗುಂಡಿ", icon: "🕳️" },
  { value: "garbage", label: "Garbage Dump / Overflow", kannada: "ಕಸ", icon: "🗑️" },
  { value: "streetlight", label: "Broken Streetlight", kannada: "ಬೀದಿ ದೀಪ", icon: "💡" },
  { value: "water_leak", label: "Water Pipeline Leak", kannada: "ನೀರು ಸೋರಿಕೆ", icon: "💧" },
  { value: "other", label: "Other Civic Issue", kannada: "ಇತರೆ", icon: "⚠️" },
];

export default CATEGORY_MAP;
