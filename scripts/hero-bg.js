(function initHeroIllustration() {
    const container = document.getElementById('particle-bg');
    if (!container) return;

    const INK    = '#111111';
    const CREAM  = '#f3eee3';
    const CARD   = '#ebe5d8';
    const RED    = '#eb1d25';
    const DARK   = '#1c1c1e';
    const DARKER = '#141416';

    container.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 520"
     width="100%" height="100%"
     aria-hidden="true" style="overflow:visible">

<defs>
  <style>
    @keyframes floatUp   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
    @keyframes floatDown { 0%,100%{transform:translateY(0)}   50%{transform:translateY(10px)}  }
    @keyframes floatSide { 0%,100%{transform:translateX(0)}   50%{transform:translateX(-8px)}  }
    @keyframes blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes drift     { 0%,100%{transform:translate(0,0)}  50%{transform:translate(5px,-8px)} }
    @keyframes pulse     { 0%,100%{opacity:0.6} 50%{opacity:1} }
    .float-a { animation: floatUp   4.2s ease-in-out infinite; }
    .float-b { animation: floatDown 5.5s ease-in-out infinite; }
    .float-c { animation: floatUp   6s   ease-in-out infinite; animation-delay:-2s; }
    .float-d { animation: floatSide 4.8s ease-in-out infinite; }
    .float-e { animation: floatUp   7s   ease-in-out infinite; animation-delay:-3s; }
    .blink-cur { animation: blink 1s step-end infinite; }
    .drift-g   { animation: drift 6s ease-in-out infinite; }
    .pulse-g   { animation: pulse 3s ease-in-out infinite; }
  </style>

  <radialGradient id="screenGlow" cx="50%" cy="40%" r="60%">
    <stop offset="0%"   stop-color="${RED}" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
  </radialGradient>

  <filter id="shadow" x="-10%" y="-10%" width="125%" height="135%">
    <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="${INK}" flood-opacity="0.12"/>
  </filter>
  <filter id="shadowSm" x="-15%" y="-20%" width="130%" height="145%">
    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${INK}" flood-opacity="0.1"/>
  </filter>
</defs>

<!-- Background ambient glow -->
<ellipse cx="240" cy="260" rx="220" ry="200" fill="url(#screenGlow)"/>

<!-- ══════════════════════════════════════
     LAPTOP
     ══════════════════════════════════════ -->

<!-- Base / foot bar -->
<rect x="80" y="348" width="320" height="20" rx="4" fill="${INK}" filter="url(#shadow)"/>

<!-- Keyboard deck -->
<rect x="84" y="308" width="312" height="44" rx="6" fill="#222224"/>

<!-- Trackpad -->
<rect x="186" y="320" width="108" height="24" rx="4" fill="#2a2a2c" stroke="#333" stroke-width="0.5"/>

<!-- Key rows -->
<g fill="#2e2e30">
  <rect x="94"  y="313" width="13" height="5" rx="1.5"/>
  <rect x="111" y="313" width="13" height="5" rx="1.5"/>
  <rect x="128" y="313" width="13" height="5" rx="1.5"/>
  <rect x="145" y="313" width="13" height="5" rx="1.5"/>
  <rect x="162" y="313" width="13" height="5" rx="1.5"/>
  <rect x="179" y="313" width="13" height="5" rx="1.5"/>
  <rect x="196" y="313" width="13" height="5" rx="1.5"/>
  <rect x="213" y="313" width="13" height="5" rx="1.5"/>
  <rect x="230" y="313" width="13" height="5" rx="1.5"/>
  <rect x="247" y="313" width="13" height="5" rx="1.5"/>
  <rect x="264" y="313" width="13" height="5" rx="1.5"/>
  <rect x="281" y="313" width="13" height="5" rx="1.5"/>
  <rect x="298" y="313" width="13" height="5" rx="1.5"/>
  <rect x="315" y="313" width="25" height="5" rx="1.5"/>
</g>

<!-- Hinge -->
<rect x="80" y="304" width="320" height="6" rx="2" fill="#1a1a1c"/>

<!-- Screen lid outer -->
<rect x="84" y="88" width="312" height="218" rx="10" fill="${DARKER}" filter="url(#shadow)"/>

<!-- Screen surface -->
<rect x="92" y="96" width="296" height="202" rx="6" fill="#141416"/>

<!-- Title bar -->
<rect x="92" y="96" width="296" height="26" rx="6" fill="#1e1e20"/>
<rect x="92" y="109" width="296" height="13" fill="#1e1e20"/>

<!-- Traffic lights -->
<circle cx="110" cy="109" r="4.5" fill="#ff5f57"/>
<circle cx="123" cy="109" r="4.5" fill="#ffbd2e"/>
<circle cx="136" cy="109" r="4.5" fill="#28c840"/>

<!-- Tab label -->
<text x="156" y="114" font-family="monospace" font-size="8.5" fill="#666" letter-spacing="0.3">ravi@dev  ~  terminal</text>

<!-- Camera -->
<circle cx="240" cy="101" r="2.5" fill="#1e1e20"/>
<circle cx="240" cy="101" r="1"   fill="#2a2a2a"/>

<!-- Terminal content — tspan for inline coloring (fixes word spacing) -->
<g font-family="'Courier New', Courier, monospace" font-size="10" letter-spacing="0">

  <!-- $ git push origin main -->
  <text x="104" y="143">
    <tspan fill="#555">$ </tspan><tspan fill="#28c840">git</tspan><tspan fill="#ccc"> push origin main</tspan>
  </text>

  <!-- Enumerating line -->
  <text x="104" y="157" fill="#444">Enumerating objects: 12, done.</text>

  <!-- Writing objects with percent highlight -->
  <text x="104" y="171">
    <tspan fill="#444">Writing objects: </tspan><tspan fill="${RED}">100%</tspan><tspan fill="#444"> (8/8)</tspan>
  </text>

  <!-- Success -->
  <text x="104" y="185" fill="#28c840">Branch 'main' set to origin/main.</text>

  <!-- blank line gap — y+20 -->

  <!-- $ snap-x render -->
  <text x="104" y="207">
    <tspan fill="#555">$ </tspan><tspan fill="#7c9fd4">snap-x</tspan><tspan fill="#ccc"> render </tspan><tspan fill="#f0a500">designs/*.mjs</tspan>
  </text>

  <!-- Output lines with checkmarks drawn as SVG not unicode -->
  <text x="104" y="221">
    <tspan fill="#28c840">&#10003;</tspan><tspan fill="#666">  og.png</tspan><tspan fill="#444">                1200&#215;630</tspan>
  </text>
  <text x="104" y="235">
    <tspan fill="#28c840">&#10003;</tspan><tspan fill="#666">  linkedin-cover.png</tspan><tspan fill="#444">    1584&#215;396</tspan>
  </text>

  <!-- Blinking prompt -->
  <text x="104" y="249" fill="#555">$</text>
  <rect x="114" y="240" width="7" height="10" fill="#888" class="blink-cur"/>
</g>

<!-- ══════════════════════════════════════
     FLOATING BADGES — 4 clean ones
     ══════════════════════════════════════ -->

<!-- { }  top-left -->
<g class="float-a" transform="translate(14, 54)">
  <rect x="0" y="0" width="72" height="38" rx="10" fill="${CREAM}" stroke="${INK}" stroke-width="1.5" filter="url(#shadowSm)"/>
  <text x="36" y="26" font-family="Georgia, serif" font-size="20" font-weight="700"
        fill="${INK}" text-anchor="middle" letter-spacing="2">{ }</text>
</g>

<!-- </> top-right  — no space inside -->
<g class="float-c" transform="translate(372, 42)">
  <rect x="0" y="0" width="80" height="36" rx="10" fill="${RED}" filter="url(#shadowSm)"/>
  <text x="40" y="24" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="700"
        fill="${CREAM}" text-anchor="middle">&lt;/&gt;</text>
</g>

<!-- const  left-middle -->
<g class="float-d" transform="translate(4, 198)">
  <rect x="0" y="0" width="64" height="28" rx="8" fill="${INK}" filter="url(#shadowSm)"/>
  <text x="32" y="19" font-family="'Courier New', Courier, monospace" font-size="11" font-weight="700"
        fill="${CREAM}" text-anchor="middle">const</text>
</g>

<!-- /api/v2 pill  bottom-left — dot + text in one local coord system -->
<g class="float-e" transform="translate(14, 390)">
  <rect x="0" y="0" width="94" height="32" rx="16" fill="${CREAM}" stroke="${INK}" stroke-width="1.5" filter="url(#shadowSm)"/>
  <!-- green dot, centered vertically -->
  <circle cx="17" cy="16" r="5.5" fill="#28c840"/>
  <!-- text starts right after dot, baseline aligned to circle center -->
  <text x="29" y="20.5" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="700"
        fill="${INK}">/api/v2</text>
</g>

<!-- ══════════════════════════════════════
     DATABASE  bottom-right
     ══════════════════════════════════════ -->
<g class="float-b" transform="translate(386, 362)">
  <!-- cylinder sides (rect without top border) -->
  <path d="M0,12 L0,42 Q0,50 22,50 Q44,50 44,42 L44,12" fill="${CREAM}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- top ellipse (top cap) -->
  <ellipse cx="22" cy="12" rx="22" ry="7" fill="${CARD}" stroke="${INK}" stroke-width="1.5"/>
  <!-- mid line (second tier) -->
  <ellipse cx="22" cy="26" rx="22" ry="7" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 4" opacity="0.45"/>
  <!-- bottom cap -->
  <ellipse cx="22" cy="42" rx="22" ry="7" fill="${CARD}" stroke="${INK}" stroke-width="1.5"/>
</g>

<!-- ══════════════════════════════════════
     ROCKET  bottom-center
     ══════════════════════════════════════ -->
<g class="drift-g" transform="translate(202, 416)">
  <!-- body -->
  <path d="M10,38 Q10,10 20,2 Q30,10 30,38 Z" fill="${INK}"/>
  <!-- nose cone -->
  <path d="M10,14 Q20,0 30,14 Z" fill="${INK}"/>
  <!-- window -->
  <circle cx="20" cy="22" r="5" fill="${CREAM}"/>
  <circle cx="20" cy="22" r="3" fill="${RED}"/>
  <!-- fins -->
  <path d="M10,32 L4,42 L12,38 Z" fill="${INK}"/>
  <path d="M30,32 L36,42 L28,38 Z" fill="${INK}"/>
  <!-- flame -->
  <ellipse cx="20" cy="42" rx="5.5" ry="5" fill="${RED}" opacity="0.9" class="pulse-g"/>
  <ellipse cx="20" cy="45" rx="3" ry="3.5" fill="#f0a500" opacity="0.85" class="pulse-g"/>
</g>

<!-- Red accent dot cluster (top-right corner, decorative) -->
<g fill="${RED}" class="pulse-g">
  <circle cx="348" cy="58"  r="3.5" opacity="0.7"/>
  <circle cx="360" cy="50"  r="2"   opacity="0.5"/>
  <circle cx="354" cy="68"  r="2"   opacity="0.4"/>
</g>

<!-- Sparkle cross shapes (pure SVG, no unicode) -->
<g stroke="${RED}" stroke-width="1.5" stroke-linecap="round" opacity="0.5" class="pulse-g">
  <line x1="455" y1="135" x2="455" y2="145"/>
  <line x1="450" y1="140" x2="460" y2="140"/>
</g>
<g stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity="0.18">
  <line x1="30"  y1="368" x2="30"  y2="376"/>
  <line x1="26"  y1="372" x2="34"  y2="372"/>
  <line x1="460" y1="285" x2="460" y2="291"/>
  <line x1="457" y1="288" x2="463" y2="288"/>
</g>

</svg>`;
})();
