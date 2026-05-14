// Bottom jungle scene illustration
export function JungleBottom() {
  return (
    <div className="pointer-events-none absolute bottom-16 left-0 right-0 w-full overflow-hidden" style={{ height: '260px' }}>
      <svg viewBox="0 0 390 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Misty background hills */}
        <ellipse cx="320" cy="220" rx="160" ry="80" fill="#c8dbc0" opacity="0.18" />
        <ellipse cx="80" cy="230" rx="120" ry="60" fill="#c8dbc0" opacity="0.15" />
        <ellipse cx="200" cy="240" rx="200" ry="50" fill="#b5ccab" opacity="0.13" />

        {/* Far background trees (misty) */}
        <ellipse cx="310" cy="185" rx="38" ry="50" fill="#9dbf8e" opacity="0.22" />
        <ellipse cx="355" cy="195" rx="28" ry="40" fill="#9dbf8e" opacity="0.18" />
        <ellipse cx="270" cy="195" rx="25" ry="38" fill="#9dbf8e" opacity="0.18" />
        <rect x="307" y="220" width="6" height="30" fill="#7a9a6a" opacity="0.2" />

        {/* Ground */}
        <path d="M0 235 Q60 215 130 228 Q200 240 280 225 Q340 215 390 228 L390 260 L0 260Z" fill="#8fb87a" opacity="0.55" />
        <path d="M0 245 Q80 232 160 242 Q240 252 320 238 Q360 230 390 240 L390 260 L0 260Z" fill="#7aaa64" opacity="0.45" />

        {/* Grass tufts */}
        <ellipse cx="50" cy="240" rx="30" ry="10" fill="#5d9448" opacity="0.5" />
        <ellipse cx="120" cy="244" rx="22" ry="8" fill="#5d9448" opacity="0.4" />
        <ellipse cx="200" cy="242" rx="25" ry="7" fill="#5d9448" opacity="0.35" />
        <ellipse cx="310" cy="238" rx="20" ry="6" fill="#5d9448" opacity="0.35" />
        <ellipse cx="370" cy="243" rx="18" ry="6" fill="#5d9448" opacity="0.4" />

        {/* Main tree - trunk */}
        <path d="M75 255 Q68 220 62 185 Q58 160 70 140 Q80 125 85 105" stroke="#7a5230" strokeWidth="12" fill="none" strokeLinecap="round" />
        {/* Tree trunk base roots */}
        <path d="M75 255 Q60 250 45 255" stroke="#7a5230" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M75 255 Q85 248 100 252" stroke="#7a5230" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Branch right */}
        <path d="M72 160 Q95 145 115 138" stroke="#7a5230" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Branch left small */}
        <path d="M68 175 Q50 165 38 168" stroke="#7a5230" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* Tree foliage - layered circles */}
        <circle cx="85" cy="100" r="42" fill="#4a8f3a" opacity="0.95" />
        <circle cx="68" cy="115" r="30" fill="#3d7d2e" opacity="0.9" />
        <circle cx="105" cy="112" r="28" fill="#4a8f3a" opacity="0.85" />
        <circle cx="88" cy="88" r="34" fill="#5aa044" opacity="0.9" />
        <circle cx="72" cy="98" r="22" fill="#5aa044" opacity="0.75" />
        {/* Foliage highlights */}
        <circle cx="95" cy="85" r="14" fill="#72be5a" opacity="0.5" />
        <circle cx="78" cy="92" r="10" fill="#72be5a" opacity="0.4" />

        {/* Vine hanging from tree */}
        <path d="M110 138 Q130 160 118 188 Q112 205 120 220" stroke="#5d8a3c" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Small leaves on vine */}
        <ellipse cx="126" cy="165" rx="7" ry="4" fill="#5aa044" opacity="0.8" transform="rotate(-30 126 165)" />
        <ellipse cx="116" cy="195" rx="6" ry="3.5" fill="#5aa044" opacity="0.7" transform="rotate(20 116 195)" />

        {/* Rock */}
        <ellipse cx="140" cy="246" rx="22" ry="12" fill="#a09080" opacity="0.65" />
        <ellipse cx="145" cy="243" rx="14" ry="8" fill="#b8a898" opacity="0.5" />

        {/* Small bush left */}
        <circle cx="30" cy="240" r="16" fill="#4a8f3a" opacity="0.6" />
        <circle cx="18" cy="244" r="11" fill="#3d7d2e" opacity="0.55" />
        <circle cx="42" cy="242" r="12" fill="#5aa044" opacity="0.55" />

        {/* Small bush right of rock */}
        <circle cx="175" cy="242" r="12" fill="#4a8f3a" opacity="0.5" />
        <circle cx="187" cy="244" r="9" fill="#3d7d2e" opacity="0.45" />
      </svg>
    </div>
  );
}

// Monkey on vine - top right
export function MonkeyVine({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ width: '130px', height: '180px' }}>
      <svg viewBox="0 0 130 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Vine coming from top */}
        <path d="M75 0 Q72 20 68 45 Q65 65 70 85 Q74 100 72 120" stroke="#5d8a3c" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Vine leaves */}
        <ellipse cx="62" cy="30" rx="10" ry="6" fill="#5aa044" opacity="0.9" transform="rotate(-40 62 30)" />
        <ellipse cx="78" cy="30" rx="9" ry="5" fill="#72be5a" opacity="0.8" transform="rotate(25 78 30)" />
        <ellipse cx="58" cy="58" rx="9" ry="5" fill="#5aa044" opacity="0.85" transform="rotate(-25 58 58)" />
        <ellipse cx="80" cy="65" rx="8" ry="5" fill="#72be5a" opacity="0.75" transform="rotate(35 80 65)" />

        {/* Monkey body */}
        <ellipse cx="72" cy="105" rx="18" ry="22" fill="#8B5E3C" />
        {/* Belly */}
        <ellipse cx="72" cy="108" rx="11" ry="14" fill="#C4956A" opacity="0.7" />

        {/* Monkey head */}
        <circle cx="72" cy="78" r="18" fill="#8B5E3C" />
        {/* Face */}
        <ellipse cx="72" cy="83" rx="12" ry="9" fill="#C4956A" />
        {/* Eyes */}
        <circle cx="66" cy="76" r="3" fill="#2a1a0a" />
        <circle cx="78" cy="76" r="3" fill="#2a1a0a" />
        <circle cx="67" cy="75" r="1" fill="white" opacity="0.7" />
        <circle cx="79" cy="75" r="1" fill="white" opacity="0.7" />
        {/* Nose */}
        <circle cx="70" cy="82" r="1.5" fill="#5a3520" />
        <circle cx="74" cy="82" r="1.5" fill="#5a3520" />
        {/* Smile */}
        <path d="M67 87 Q72 91 77 87" stroke="#5a3520" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Ears */}
        <circle cx="54" cy="78" r="7" fill="#8B5E3C" />
        <circle cx="54" cy="78" r="4" fill="#C4956A" opacity="0.7" />
        <circle cx="90" cy="78" r="7" fill="#8B5E3C" />
        <circle cx="90" cy="78" r="4" fill="#C4956A" opacity="0.7" />

        {/* Left arm (holding vine) */}
        <path d="M60 95 Q50 80 58 72" stroke="#8B5E3C" strokeWidth="8" fill="none" strokeLinecap="round" />
        {/* Right arm (holding vine) */}
        <path d="M84 93 Q88 78 74 72" stroke="#8B5E3C" strokeWidth="8" fill="none" strokeLinecap="round" />
        {/* Hands */}
        <circle cx="58" cy="72" r="5" fill="#6B4423" />
        <circle cx="74" cy="72" r="5" fill="#6B4423" />

        {/* Left leg */}
        <path d="M64 124 Q55 138 58 150" stroke="#8B5E3C" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Right leg */}
        <path d="M80 124 Q88 136 84 148" stroke="#8B5E3C" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Feet */}
        <ellipse cx="58" cy="152" rx="7" ry="4" fill="#6B4423" />
        <ellipse cx="84" cy="150" rx="7" ry="4" fill="#6B4423" />

        {/* Tail */}
        <path d="M78 120 Q95 130 100 120 Q108 108 98 100" stroke="#8B5E3C" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}