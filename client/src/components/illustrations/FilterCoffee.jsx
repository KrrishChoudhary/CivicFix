// client/src/components/illustrations/FilterCoffee.jsx
// Authentic South Indian Filter Coffee (Stainless Steel Tumbler & Davara) SVG Illustration

const FilterCoffee = ({ width = 56, height = 56, className = "", style = {}, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={width}
      height={height}
      className={`filter-coffee-svg ${className}`}
      style={style}
      aria-label="Filter Coffee (Tumbler and Davara)"
      role="img"
      {...props}
    >
      <defs>
        {/* Steel metallic gradient for Davara and Tumbler */}
        <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="35%" stopColor="#f8fafc" />
          <stop offset="65%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        {/* Coffee froth gradient */}
        <radialGradient id="frothGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>

      {/* Davara (Wide Saucer Base with flared rim) */}
      {/* Outer Flared Davara Bowl */}
      <path
        d="M 8 44 
           C 8 55, 18 60, 32 60 
           C 46 60, 56 55, 56 44 
           L 54 41 
           L 10 41 
           Z"
        fill="url(#steelGrad)"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* Davara Lip Rim */}
      <ellipse cx="32" cy="41" rx="23" ry="5.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
      {/* Inner Davara coffee dip shadow */}
      <ellipse cx="32" cy="42" rx="20" ry="4" fill="#78350f" opacity="0.25" />

      {/* Tumbler (Cylindrical Tapered Steel Cup) */}
      <path
        d="M 19 23 
           L 22 47 
           C 22 51, 42 51, 42 47 
           L 45 23 
           Z"
        fill="url(#steelGrad)"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* Tumbler Grooves / Grip Ridges */}
      <line x1="20.5" y1="33" x2="43.5" y2="33" stroke="#475569" strokeWidth="1" opacity="0.6" />
      <line x1="21.2" y1="38" x2="42.8" y2="38" stroke="#ffffff" strokeWidth="1" opacity="0.5" />

      {/* Tumbler Top Rim & Aromatic Frothy Coffee Foam */}
      <ellipse cx="32" cy="23" rx="13" ry="4.5" fill="url(#frothGrad)" stroke="#64748b" strokeWidth="1" />
      {/* Creamy Froth Bubbles */}
      <circle cx="29" cy="22.5" r="1.8" fill="#fffbeb" opacity="0.8" />
      <circle cx="34" cy="23.2" r="1.4" fill="#fffbeb" opacity="0.8" />
      <circle cx="26" cy="23.8" r="1.2" fill="#fffbeb" opacity="0.7" />
      <circle cx="37" cy="22.8" r="1.1" fill="#fffbeb" opacity="0.7" />

      {/* Steaming Hot Coffee Steam Swirls */}
      <path
        d="M 28 16 C 26 12, 30 9, 28 5"
        fill="none"
        stroke="var(--accent, #d97706)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M 35 15 C 37 11, 33 8, 36 4"
        fill="none"
        stroke="var(--accent, #d97706)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
};

export default FilterCoffee;
