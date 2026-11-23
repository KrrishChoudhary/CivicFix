// client/src/components/illustrations/AutoRickshaw.jsx
// Flat, friendly Bengaluru Auto-Rickshaw SVG illustration
// Authentic yellow roof canopy, charcoal chassis, and subtle Karnataka flag stripe

const AutoRickshaw = ({ width = 80, height = 56, className = "", style = {}, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 84"
      width={width}
      height={height}
      className={`auto-rickshaw-svg ${className}`}
      style={style}
      aria-label="Bengaluru Auto-Rickshaw"
      role="img"
      {...props}
    >
      <defs>
        {/* Canopy gradient */}
        <linearGradient id="autoRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        {/* Windshield glare */}
        <linearGradient id="autoGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
        </linearGradient>
        {/* Headlight beam */}
        <radialGradient id="headlightGlow" cx="0%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Headlight forward glow */}
      <polygon points="12,46 -8,38 -8,58" fill="url(#headlightGlow)" opacity="0.75" />

      {/* Chassis / Lower Body (Deep Charcoal/Black) */}
      <path
        d="M 18 52 
           L 32 52 
           C 36 52, 40 46, 46 46 
           L 96 46 
           C 102 46, 106 50, 106 56 
           L 106 62 
           C 106 65, 103 67, 100 67 
           L 18 67 
           C 14 67, 12 63, 12 59 
           Z"
        fill="#18181b"
      />

      {/* Lower Door Panel Accent Stripe (Karnataka Flag: Red & Yellow) */}
      <rect x="48" y="58" width="46" height="3" fill="#dc2626" rx="1" />
      <rect x="48" y="61" width="46" height="3" fill="#facc15" rx="1" />

      {/* Cabin Interior Base */}
      <path d="M 44 46 L 96 46 L 96 22 L 40 22 Z" fill="#27272a" />

      {/* Passenger Seat Backrest & Cushion */}
      <rect x="80" y="32" width="14" height="15" rx="3" fill="#71717a" />
      <rect x="74" y="44" width="22" height="4" rx="2" fill="#52525b" />

      {/* Driver Seat & Handlebar Post */}
      <rect x="46" y="38" width="10" height="10" rx="2" fill="#52525b" />
      <line x1="36" y1="44" x2="42" y2="34" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" />
      {/* Fare Meter box */}
      <rect x="36" y="34" width="5" height="4" rx="1" fill="#ef4444" />

      {/* Front Windshield Pillar & Glass */}
      <polygon points="34,22 42,22 36,46 22,46" fill="url(#autoGlassGrad)" stroke="#18181b" strokeWidth="1.5" />
      <line x1="28" y1="26" x2="33" y2="42" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />

      {/* Yellow Canopy / Roof (Iconic curved auto-rickshaw hood) */}
      <path
        d="M 18 24
           C 22 17, 34 13, 52 13
           L 96 13
           C 104 13, 108 17, 108 23
           L 108 26
           C 108 27, 106 28, 104 28
           L 24 28
           C 20 28, 17 26, 18 24
           Z"
        fill="url(#autoRoofGrad)"
        stroke="#d97706"
        strokeWidth="1.2"
      />
      {/* Front curved canopy visor */}
      <path
        d="M 18 24 
           C 19 21, 26 18, 36 18 
           L 24 28 
           Z"
        fill="#fbbf24"
      />

      {/* Rear Roof Support Pillar */}
      <line x1="102" y1="28" x2="102" y2="46" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" />
      {/* Middle Support Bar */}
      <line x1="42" y1="28" x2="42" y2="46" stroke="#18181b" strokeWidth="2.5" />

      {/* Front Chrome Headlight */}
      <circle cx="13" cy="50" r="4.5" fill="#fef08a" stroke="#d4d4d8" strokeWidth="1.5" />
      <circle cx="12" cy="49" r="1.5" fill="#ffffff" />

      {/* Wheels */}
      {/* Front Wheel */}
      <g>
        {/* Black Tyre */}
        <circle cx="26" cy="66" r="11" fill="#18181b" />
        {/* Steel Rim */}
        <circle cx="26" cy="66" r="6.5" fill="#e4e4e7" stroke="#71717a" strokeWidth="1" />
        {/* Hubcap */}
        <circle cx="26" cy="66" r="2.5" fill="#18181b" />
        {/* Front Mudguard */}
        <path d="M 15 63 C 16 54, 34 54, 37 63" fill="none" stroke="#18181b" strokeWidth="3" />
      </g>

      {/* Rear Wheel */}
      <g>
        {/* Black Tyre */}
        <circle cx="90" cy="66" r="12" fill="#18181b" />
        {/* Steel Rim */}
        <circle cx="90" cy="66" r="7.5" fill="#e4e4e7" stroke="#71717a" strokeWidth="1" />
        {/* Hubcap */}
        <circle cx="90" cy="66" r="3" fill="#18181b" />
        {/* Rear Wheel Arch Cover */}
        <path d="M 76 64 C 78 52, 102 52, 104 64" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      </g>
    </svg>
  );
};

export default AutoRickshaw;
