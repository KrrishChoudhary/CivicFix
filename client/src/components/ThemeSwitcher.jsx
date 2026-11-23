// client/src/components/ThemeSwitcher.jsx
// Compact, accessible theme switcher component for CivicFix navbar
// Supports Light, Dark, Ocean, Sunset, and Namma themes with keyboard accessibility and mobile responsiveness

import { useTheme } from "../context/ThemeContext";

const THEMES = [
  { id: "light", label: "Light", icon: "☀️" },
  { id: "dark", label: "Dark", icon: "🌙" },
  { id: "ocean", label: "Ocean", icon: "🌊" },
  { id: "sunset", label: "Sunset", icon: "🌅" },
  { id: "namma", label: "Namma", icon: "🛺" },
];

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher" title={`Current theme: ${theme}`}>
      <label htmlFor="theme-switcher-select" className="sr-only">
        Select visual theme
      </label>
      <select
        id="theme-switcher-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="theme-switcher-select"
        aria-label="Color theme selector"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.icon} {t.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeSwitcher;
