// client/src/context/ThemeContext.jsx
// Theme management context supporting Light, Dark, Ocean, Sunset, and Namma themes
// Persists selection to localStorage and defaults to OS preference (prefers-color-scheme)

import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const VALID_THEMES = ["light", "dark", "ocean", "sunset", "namma"];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // 1. Check saved theme preference in localStorage
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("civicfix_theme");
      if (savedTheme && VALID_THEMES.includes(savedTheme)) {
        return savedTheme;
      }

      // 2. Fall back to user OS color scheme preference
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }

    return "light";
  });

  const setTheme = (newTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setThemeState(newTheme);
      try {
        localStorage.setItem("civicfix_theme", newTheme);
      } catch (err) {
        console.warn("Unable to save theme to localStorage:", err);
      }
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  useEffect(() => {
    // Synchronize data-theme on <html> root element
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: VALID_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
