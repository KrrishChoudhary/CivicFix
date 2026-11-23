// client/src/components/illustrations/SkylineStrip.jsx
// Iconic Bengaluru Skyline Silhouette Strip
// Landmarks: Vidhana Soudha, Lalbagh Glasshouse, Namma Metro Elevated Viaduct & Train, Tech Park Towers & Trees
// Uses currentColor to effortlessly match every visual theme (Light, Dark, Ocean, Sunset, Namma)

const SkylineStrip = ({ className = "", style = {}, height = 90, ...props }) => {
  return (
    <div
      className={`bengaluru-skyline-wrapper ${className}`}
      style={{ overflow: "hidden", lineHeight: 0, width: "100%", ...style }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 130"
        width="100%"
        height={height}
        preserveAspectRatio="none"
        aria-label="Bengaluru Skyline Silhouette (Vidhana Soudha, Lalbagh Glasshouse, Namma Metro, Tech Park)"
        role="img"
        {...props}
      >
        {/* Soft Background Layer / Distant Tech Skyline */}
        <g fill="currentColor" opacity="0.22">
          {/* Tech Park Distant Towers */}
          <rect x="60" y="45" width="34" height="75" rx="1" />
          <rect x="105" y="30" width="45" height="90" rx="1" />
          <rect x="490" y="40" width="38" height="80" rx="1" />
          <rect x="535" y="25" width="50" height="95" rx="1" />
          <polygon points="560,10 560,25 562,25 562,10" />
          <rect x="910" y="35" width="42" height="85" rx="1" />
          <rect x="960" y="20" width="55" height="100" rx="1" />
          <polygon points="987,5 987,20 989,20 989,5" />
          <rect x="1025" y="40" width="48" height="80" rx="1" />
          <rect x="1080" y="28" width="60" height="92" rx="1" />
        </g>

        {/* Primary Foreground Silhouette Layer */}
        <g fill="currentColor" opacity="0.65">
          {/* ========================================================
              1. VIDHANA SOUDHA (Left Side, x: 160 - 360)
              Neo-Dravidian grand dome, tiered kalasa spire, corner chhatris
             ======================================================== */}
          {/* Base Plinth & Steps */}
          <rect x="160" y="104" width="200" height="16" />
          <polygon points="150,120 160,104 360,104 370,120" />

          {/* Main 3-tier Facade with Pillars */}
          <rect x="175" y="72" width="170" height="32" />
          {/* Portico Gable / Pediment */}
          <polygon points="215,72 305,72 260,54" />
          {/* Entrance Columns */}
          <line x1="225" y1="72" x2="225" y2="104" stroke="currentColor" strokeWidth="3" />
          <line x1="240" y1="72" x2="240" y2="104" stroke="currentColor" strokeWidth="3" />
          <line x1="260" y1="72" x2="260" y2="104" stroke="currentColor" strokeWidth="3" />
          <line x1="280" y1="72" x2="280" y2="104" stroke="currentColor" strokeWidth="3" />
          <line x1="295" y1="72" x2="295" y2="104" stroke="currentColor" strokeWidth="3" />

          {/* Central Tier & Dome Base */}
          <rect x="230" y="44" width="60" height="12" rx="1" />
          {/* Grand Central Dome */}
          <path d="M 235 44 C 235 20, 285 20, 285 44 Z" />
          {/* Kalasa / Finial Spire */}
          <polygon points="258,22 262,22 260,6" />
          <circle cx="260" cy="5" r="2.5" />

          {/* Left Corner Chhatri Dome */}
          <rect x="180" y="60" width="18" height="12" />
          <path d="M 178 60 C 178 48, 200 48, 200 60 Z" />
          <line x1="189" y1="48" x2="189" y2="40" stroke="currentColor" strokeWidth="2" />

          {/* Right Corner Chhatri Dome */}
          <rect x="322" y="60" width="18" height="12" />
          <path d="M 320 60 C 320 48, 342 48, 342 60 Z" />
          <line x1="331" y1="48" x2="331" y2="40" stroke="currentColor" strokeWidth="2" />

          {/* Bengaluru Rain Tree near Vidhana Soudha */}
          <path d="M 130 120 C 125 100, 110 80, 130 70 C 145 60, 160 75, 155 90 C 165 95, 160 115, 140 120 Z" />
          <rect x="133" y="105" width="4" height="15" />

          {/* ========================================================
              2. LALBAGH GLASSHOUSE (Center-Left, x: 380 - 520)
              Victorian vaulted crystal glass arches & curved transepts
             ======================================================== */}
          {/* Ground Footing */}
          <rect x="385" y="112" width="130" height="8" rx="1" />
          {/* Side Wings */}
          <rect x="390" y="92" width="120" height="20" rx="2" />
          {/* Side Arched Ribs */}
          <path d="M 390 92 C 390 75, 435 75, 435 92" />
          <path d="M 465 92 C 465 75, 510 75, 510 92" />
          {/* Main Central Vaulted Transept Dome */}
          <path d="M 425 92 C 425 50, 475 50, 475 92 Z" />
          {/* Central Glasshouse Crown & Ornamental Spire */}
          <circle cx="450" cy="46" r="3" />
          <polygon points="449,46 451,46 450,38" />

          {/* Lush Heritage Garden Trees flanking Glasshouse */}
          <path d="M 370 120 C 360 105, 365 85, 380 82 C 395 80, 395 105, 380 120 Z" />
          <path d="M 525 120 C 515 102, 520 80, 535 78 C 550 76, 550 105, 535 120 Z" />

          {/* ========================================================
              3. NAMMA METRO ELEVATED VIADUCT & TRAIN (Center-Right, x: 550 - 860)
              Concrete pillars, viaduct deck, and modern 3-car metro train
             ======================================================== */}
          {/* Concrete Metro Flyover Pillars */}
          <rect x="580" y="86" width="12" height="34" />
          <polygon points="572,86 600,86 592,94 580,94" />

          <rect x="670" y="86" width="12" height="34" />
          <polygon points="662,86 690,86 682,94 670,94" />

          <rect x="760" y="86" width="12" height="34" />
          <polygon points="752,86 780,86 772,94 760,94" />

          <rect x="850" y="86" width="12" height="34" />
          <polygon points="842,86 870,86 862,94 850,94" />

          {/* Continuous Viaduct Beam / Track Bed */}
          <rect x="550" y="82" width="330" height="7" rx="1" />
          <line x1="550" y1="89" x2="880" y2="89" stroke="currentColor" strokeWidth="1.5" />

          {/* Namma Metro Train - 3 Coaches */}
          {/* Coach 1: Aerodynamic Lead Car */}
          <path d="M 610 82 L 675 82 L 675 66 L 625 66 Q 612 66 610 82 Z" />
          {/* Coach 2: Center Car with Pantograph */}
          <rect x="680" y="66" width="65" height="16" rx="2" />
          {/* Roof Pantograph */}
          <line x1="705" y1="66" x2="712" y2="58" stroke="currentColor" strokeWidth="1.5" />
          <line x1="712" y1="58" x2="720" y2="66" stroke="currentColor" strokeWidth="1.5" />
          <line x1="708" y1="58" x2="716" y2="58" stroke="currentColor" strokeWidth="2.5" />

          {/* Coach 3: Rear Car */}
          <rect x="750" y="66" width="65" height="16" rx="2" />

          {/* Metro Passenger Windows cutout representation */}
          <g fill="var(--bg-color, #ffffff)" opacity="0.8">
            <rect x="628" y="70" width="10" height="6" rx="1" />
            <rect x="643" y="70" width="12" height="6" rx="1" />
            <rect x="660" y="70" width="10" height="6" rx="1" />

            <rect x="686" y="70" width="12" height="6" rx="1" />
            <rect x="704" y="70" width="14" height="6" rx="1" />
            <rect x="724" y="70" width="14" height="6" rx="1" />

            <rect x="756" y="70" width="14" height="6" rx="1" />
            <rect x="776" y="70" width="14" height="6" rx="1" />
            <rect x="796" y="70" width="12" height="6" rx="1" />
          </g>

          {/* ========================================================
              4. TECH PARK MODERN TOWERS & CANOPY (Right, x: 880 - 1180)
              Stepped tech architecture, antenna spires, Silicon Valley vibe
             ======================================================== */}
          {/* Tower 1 */}
          <rect x="885" y="48" width="46" height="72" rx="2" />
          <rect x="895" y="38" width="26" height="10" rx="1" />

          {/* Tower 2: Tallest Tech Hub Spire */}
          <rect x="945" y="24" width="58" height="96" rx="2" />
          <polygon points="965,24 985,24 975,12" />
          <line x1="975" y1="12" x2="975" y2="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="975" cy="2" r="1.5" />

          {/* Tower 3 */}
          <rect x="1015" y="42" width="52" height="78" rx="2" />
          <polygon points="1025,42 1055,42 1040,30" />

          {/* Tower 4 */}
          <rect x="1080" y="52" width="60" height="68" rx="2" />

          {/* Far-Right Greenery / Gulmohar Tree */}
          <path d="M 1150 120 C 1140 100, 1145 78, 1165 74 C 1185 70, 1195 95, 1180 120 Z" />
        </g>

        {/* Ground Baseline */}
        <line x1="0" y1="120" x2="1200" y2="120" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </svg>
    </div>
  );
};

export default SkylineStrip;
