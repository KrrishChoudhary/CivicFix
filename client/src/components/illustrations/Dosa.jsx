// client/src/components/illustrations/Dosa.jsx
// Golden Mysore Masala Dosa with Chutney Bowls SVG Illustration

const Dosa = ({ width = 56, height = 56, className = "", style = {}, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={width}
      height={height}
      className={`dosa-svg ${className}`}
      style={style}
      aria-label="Crispy Bengaluru Masala Dosa"
      role="img"
      {...props}
    >
      <defs>
        {/* Golden Brown Crispy Dosa Crust Gradient */}
        <linearGradient id="dosaCrustGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Banana Leaf Base Plate */}
      <ellipse cx="32" cy="44" rx="28" ry="14" fill="#22c55e" opacity="0.85" />
      <path d="M 6 44 Q 32 40 58 44" fill="none" stroke="#16a34a" strokeWidth="1.5" opacity="0.6" />

      {/* Crispy Folded Cylinder / Roll Dosa */}
      <g transform="rotate(-12 32 38)">
        {/* Dosa Body */}
        <ellipse cx="32" cy="38" rx="22" ry="7" fill="url(#dosaCrustGrad)" stroke="#92400e" strokeWidth="1" />
        {/* Roasted Ghee Golden Patches */}
        <ellipse cx="30" cy="37" rx="14" ry="4" fill="#78350f" opacity="0.3" />
        <ellipse cx="36" cy="38" rx="8" ry="2.5" fill="#fef3c7" opacity="0.5" />
        {/* Crisp Rolled Edges */}
        <path d="M 12 38 Q 32 34 52 38" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        {/* Dollop of White Butter on Top */}
        <ellipse cx="31" cy="34" rx="3.5" ry="2.2" fill="#fffbeb" stroke="#fef08a" strokeWidth="0.8" />
      </g>

      {/* Coconut Chutney Cup (White) */}
      <circle cx="16" cy="48" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
      <circle cx="16" cy="48" r="5" fill="#f8fafc" />
      {/* Mustard seeds & curry leaf tadka */}
      <circle cx="15.5" cy="47" r="0.6" fill="#18181b" />
      <circle cx="17.2" cy="49" r="0.6" fill="#18181b" />
      <path d="M 14 49 Q 15 47 16 48" fill="none" stroke="#15803d" strokeWidth="0.8" />

      {/* Tomato / Red Chutney Cup (Spicy Red) */}
      <circle cx="48" cy="48" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
      <circle cx="48" cy="48" r="5" fill="#dc2626" />
      {/* Mustard seed tadka */}
      <circle cx="47.5" cy="47.5" r="0.6" fill="#18181b" />
      <circle cx="49" cy="48.5" r="0.6" fill="#fef08a" />
    </svg>
  );
};

export default Dosa;
