// La figure « devient vraie » : une fois toutes les pièces posées, les formes plates laissent place à
// une illustration détaillée de l'objet (le château en pierre avec ses drapeaux, la fusée avec son
// hublot et ses flammes…). Chaque dessin est calé sur les emplacements de sa figure (même repère
// 100 × 100, voir figures.ts) : l'enfant reconnaît ses pièces dans l'objet final. Les éléments
// vivants (fumée, flammes, vagues, clignotants) sont animés en CSS (builder.css, classes bld-real-*).
import type { JSX } from 'preact';
import type { FigureId } from '../../engine/types';

const SHADOW = 'rgba(61, 44, 30, 0.16)';

/** Rangée de tuiles arrondies (toit de la maison) entre x0 et x1, à l'ordonnée y. */
function scallops(y: number, x0: number, x1: number, r = 2.2): string {
  let d = `M${x0} ${y}`;
  for (let x = x0; x + 2 * r <= x1 + 0.01; x += 2 * r) d += `a${r} ${r} 0 0 0 ${2 * r} 0`;
  return d;
}

/** Appareil de pierres (château) : joints horizontaux tous les `row`, joints verticaux décalés. */
function stones(x: number, y: number, w: number, h: number, row = 6, stone = 8): string {
  let d = '';
  for (let yy = y + row, i = 0; yy < y + h; yy += row, i += 1) {
    d += `M${x} ${yy}H${x + w}`;
    const offset = i % 2 === 0 ? stone / 2 : 0;
    for (let xx = x + offset + stone; xx < x + w - 1; xx += stone) d += `M${xx} ${yy - row}V${yy}`;
  }
  return d;
}

// ---------- La maison ----------

function House() {
  return (
    <>
      <ellipse cx="50" cy="97" rx="42" ry="3" fill={SHADOW} />
      <g class="bld-real-smoke">
        <circle cx="65.5" cy="14" r="3" />
        <circle cx="67" cy="14" r="2.4" />
        <circle cx="64.5" cy="14" r="2" />
      </g>
      <rect x="61.5" y="19" width="8" height="16" fill="#9c4a3a" />
      <rect x="60.5" y="17" width="10" height="3.5" rx="1" fill="#7d3a2d" />
      {/* Murs */}
      <rect x="25" y="41" width="50" height="45" fill="#f6e3c1" />
      <rect x="25" y="79" width="50" height="7" fill="#ead0a3" />
      <path d="M29 48h6M40 70h7M63 72h6M66 46h5M31 76h5" stroke="#e4c898" stroke-width="1.4" stroke-linecap="round" />
      {/* Toit de tuiles */}
      <path d="M17 44L50 15L83 44Z" fill="#c8553d" stroke="#c8553d" stroke-width="2" stroke-linejoin="round" />
      <g fill="none" stroke="#a8432f" stroke-width="1.1">
        <path d={scallops(27, 38, 62)} />
        <path d={scallops(33, 31.5, 68.5)} />
        <path d={scallops(39, 24.5, 75.5)} />
      </g>
      <path d="M22 41L46 19.5" stroke="#e57a61" stroke-width="1.6" stroke-linecap="round" />
      {/* Lucarne ronde */}
      <circle cx="50" cy="31" r="4.2" fill="#ffffff" />
      <circle cx="50" cy="31" r="3.1" class="bld-real-window" />
      <path d="M50 28v6M47 31h6" stroke="#ffffff" stroke-width="0.9" />
      {/* Fenêtres, volets, jardinières */}
      {[29, 61].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="51" width="3" height="12" rx="0.8" fill="#4f9d44" />
          <rect x={x + 10} y="51" width="3" height="12" rx="0.8" fill="#4f9d44" />
          <rect x={x} y="51" width="10" height="12" rx="1" fill="#ffffff" />
          <rect x={x + 1} y="52" width="8" height="10" rx="0.6" class="bld-real-window" />
          <path d={`M${x + 5} 52v10M${x + 1} 57h8`} stroke="#ffffff" stroke-width="1" />
          <rect x={x - 1} y="63" width="12" height="3" rx="1" fill="#8b5a2b" />
          <circle cx={x + 1.5} cy="62.6" r="1.4" fill="#ff5a7a" />
          <circle cx={x + 5} cy="62.2" r="1.4" fill="#ffd23f" />
          <circle cx={x + 8.5} cy="62.6" r="1.4" fill="#ff5a7a" />
        </g>
      ))}
      {/* Porte */}
      <path d="M42 96V81a8 8 0 0 1 16 0v15Z" fill="#8b5a2b" />
      <path d="M46 75.5V96M50 73V96M54 75.5V96" stroke="#744a22" stroke-width="0.8" />
      <circle cx="55.3" cy="87" r="1.1" fill="#ffc93c" />
      <rect x="39" y="95" width="22" height="3" rx="1" fill="#c7bba8" />
      {/* Buissons */}
      <circle cx="23" cy="87" r="5" fill="#58a646" />
      <circle cx="28" cy="88" r="4" fill="#67b853" />
      <circle cx="77" cy="87" r="5" fill="#58a646" />
      <circle cx="72" cy="88" r="4" fill="#67b853" />
    </>
  );
}

// ---------- Le sapin ----------

function Tree() {
  const baubles: [number, number, string][] = [
    [44, 28, '#e63946'],
    [56, 33, '#ffd23f'],
    [40, 44, '#1d7fd8'],
    [58, 47, '#e63946'],
    [49, 41, '#ff8fab'],
    [34, 60, '#ffd23f'],
    [47, 57, '#1d7fd8'],
    [64, 60, '#ff8fab'],
  ];
  return (
    <>
      <ellipse cx="50" cy="94" rx="26" ry="3" fill={SHADOW} />
      <rect x="44" y="60" width="12" height="33" rx="2" fill="#8b5a2b" />
      <path d="M47 66v8M52 72v9M48 82v7" stroke="#6f4520" stroke-width="1" stroke-linecap="round" />
      <path d="M21 67L50 33L79 67Q50 73 21 67Z" fill="#2f7d4f" />
      <path d="M26 51L50 21L74 51Q50 56 26 51Z" fill="#378a57" />
      <path d="M32 35L50 10L68 35Q50 39 32 35Z" fill="#43995f" />
      <path d="M26 64L44 43M31 48L45 31M37 33L47 19" stroke="#5fb36f" stroke-width="1.4" stroke-linecap="round" />
      {baubles.map(([x, y, c], i) => (
        <g key={i} class="bld-real-blink" style={{ animationDelay: `${(i % 4) * 0.35}s` }}>
          <circle cx={x} cy={y} r="2.5" fill={c} />
          <circle cx={x - 0.8} cy={y - 0.8} r="0.8" fill="#ffffff" opacity="0.8" />
        </g>
      ))}
      <polygon
        class="bld-real-star"
        points="50,2 52.2,6.8 57.4,7.3 53.5,10.8 54.6,16 50,13.3 45.4,16 46.5,10.8 42.6,7.3 47.8,6.8"
        fill="#ffc93c"
        stroke="#ffc93c"
        stroke-width="1"
        stroke-linejoin="round"
      />
      {/* Cadeaux au pied */}
      <rect x="27" y="84" width="11" height="9" rx="1" fill="#e63946" />
      <path d="M32.5 84v9M27 88.5h11" stroke="#ffd23f" stroke-width="1.6" />
      <rect x="62" y="86" width="9" height="7" rx="1" fill="#1d7fd8" />
      <path d="M66.5 86v7M62 89.5h9" stroke="#ffffff" stroke-width="1.4" />
    </>
  );
}

// ---------- Le bateau ----------

function Boat() {
  return (
    <>
      <path d="M20 21q2-2 4 0q2-2 4 0" fill="none" stroke="#5c6773" stroke-width="1" stroke-linecap="round" class="bld-real-gull" />
      {/* Mât, voiles, fanion */}
      <rect x="48.8" y="9" width="2.4" height="57" rx="1" fill="#6b4516" />
      <path d="M51.5 14Q65 36 67 61H51.5Z" fill="#fffaf0" class="bld-real-sail" />
      <path d="M51.5 42Q61 45 65.6 50L66.3 54Q58.5 49.5 51.5 47Z" fill="#e63946" class="bld-real-sail" />
      <path d="M48.5 19Q38 41 33.5 61H48.5Z" fill="#f2e7d0" />
      <path d="M51.2 9L61 11.5L51.2 14Z" fill="#e63946" class="bld-real-flag" />
      {/* Coque */}
      <path d="M13 66H87L77 84Q76 86.5 73 86.5H27Q24 86.5 23 84Z" fill="#a0522d" />
      <rect x="12" y="63.5" width="76" height="4.5" rx="2.2" fill="#7a3b1e" />
      <path d="M16.5 73H83.5" stroke="#fff7e8" stroke-width="2.6" />
      {[32, 50, 68].map((x) => (
        <g key={x}>
          <circle cx={x} cy="79.5" r="3" fill="#f3e2b0" />
          <circle cx={x} cy="79.5" r="2" fill="#bfe6ff" />
        </g>
      ))}
      {/* La mer, qui ondule devant la coque (une flaque ovale, pas une bande d'un bord à l'autre) */}
      <defs>
        <clipPath id="bld-boat-sea">
          <ellipse cx="50" cy="92" rx="46" ry="10" />
        </clipPath>
      </defs>
      <g clip-path="url(#bld-boat-sea)">
      <g class="bld-real-waves">
        <path d="M-20 86q5-3.5 10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0V104H-20Z" fill="#4aa3d4" />
        <path d="M-20 86q5-3.5 10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0" fill="none" stroke="#bfe6ff" stroke-width="1.4" />
      </g>
      </g>
    </>
  );
}

// ---------- La voiture ----------

function Wheel({ cx }: { cx: number }) {
  return (
    <g class="bld-real-wheel">
      <circle cx={cx} cy="80" r="9" fill="#2b2b2b" />
      <circle cx={cx} cy="80" r="5.2" fill="#c9ced6" />
      <path d={`M${cx - 5} 80H${cx + 5}M${cx} 75V85`} stroke="#8a929c" stroke-width="1.4" />
      <circle cx={cx} cy="80" r="1.6" fill="#8a929c" />
    </g>
  );
}

function Car() {
  return (
    <>
      <ellipse cx="50" cy="90" rx="38" ry="2.5" fill={SHADOW} />
      <g class="bld-real-puff">
        <circle cx="14" cy="73" r="2.6" />
        <circle cx="10" cy="71" r="2" />
      </g>
      <path
        d="M17 75V62Q17 55 25 54L36 53L42 37Q43.5 33 48 33H59Q63.5 33 65.5 37L72.5 53L80 54Q85 55 85 61V75Q85 78 82 78H20Q17 78 17 75Z"
        fill="#e63946"
      />
      <path d="M20 58Q21 55.5 26 55L36 54.2" stroke="#ff7a85" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <path d="M44.5 37.5H52.5V52H39.5Z" fill="#bfe6ff" />
      <path d="M55.5 37.5H60.5Q62.5 37.5 63.5 40L68.5 52H55.5Z" fill="#bfe6ff" />
      <path d="M46 40L42.5 48M58 40L56.5 44" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.8" />
      <path d="M54 54V75" stroke="#b8283a" stroke-width="0.9" />
      <rect x="56" y="57" width="4.5" height="1.4" rx="0.7" fill="#b8283a" />
      <rect x="40" y="57" width="4.5" height="1.4" rx="0.7" fill="#b8283a" />
      {/* Phare et feu arrière */}
      <path d="M85 60L98 55V68Z" fill="#ffe38f" class="bld-real-beam" />
      <ellipse cx="83" cy="61.5" rx="2" ry="2.8" fill="#ffe38f" />
      <rect x="16.5" y="59" width="2.4" height="5" rx="1" fill="#ff9f1c" />
      <rect x="14.5" y="71" width="8" height="3.4" rx="1.7" fill="#9aa3ad" />
      <rect x="79.5" y="71" width="8" height="3.4" rx="1.7" fill="#9aa3ad" />
      <Wheel cx={32} />
      <Wheel cx={68} />
    </>
  );
}

// ---------- La fusée ----------

function Rocket() {
  return (
    <>
      {[
        [14, 18],
        [84, 24],
        [22, 52],
        [80, 58],
        [12, 80],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill="#ffd23f" class="bld-real-blink" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      {/* Flammes qui sortent de la tuyère */}
      <g class="bld-real-flame">
        <path d="M43.5 83Q50 106 56.5 83Z" fill="#ff8c1a" />
        <path d="M46 83Q50 99 54 83Z" fill="#ffd23f" />
        <path d="M48.3 83Q50 92 51.7 83Z" fill="#fff4c2" />
      </g>
      <g class="bld-real-cloud">
        <circle cx="36" cy="97" r="5" />
        <circle cx="44" cy="99" r="4.5" />
        <circle cx="56" cy="99" r="4.5" />
        <circle cx="64" cy="97" r="5" />
      </g>
      {/* Ailerons */}
      <path d="M41 60Q30 67 27 87L41 80Z" fill="#e63946" />
      <path d="M59 60Q70 67 73 87L59 80Z" fill="#c92f3d" />
      {/* Tuyère */}
      <path d="M43 77H57L59.5 84H40.5Z" fill="#7d8590" />
      <rect x="42" y="77" width="16" height="2" fill="#5f6670" />
      {/* Corps */}
      <rect x="39.5" y="29" width="21" height="49" rx="5" fill="#f4f6f9" />
      <path d="M54 30Q60.5 31 60.5 38V73Q60.5 78 55 78H54Z" fill="#dde2e8" />
      <rect x="39.5" y="66" width="21" height="3.2" fill="#e63946" />
      <path d="M42.5 34V62M42.5 72V76" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" />
      {[36, 56, 74].map((y) => (
        <g key={y} fill="#c3c9d1">
          <circle cx="41.5" cy={y} r="0.6" />
          <circle cx="58.5" cy={y} r="0.6" />
        </g>
      ))}
      {/* Coiffe */}
      <path d="M39.5 32Q41 19 50 11Q59 19 60.5 32Z" fill="#e63946" />
      <path d="M44 27Q45.5 20 50 15" stroke="#ff7a85" stroke-width="1.6" stroke-linecap="round" fill="none" />
      {/* Hublot */}
      <circle cx="50" cy="45" r="6.4" fill="#9aa3ad" />
      <circle cx="50" cy="45" r="4.6" fill="#5ec0f2" class="bld-real-porthole" />
      <path d="M47 43.5a3.2 3.2 0 0 1 2.6-2.2" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" fill="none" />
      {[0, 90, 180, 270].map((a) => (
        <circle key={a} cx={50 + 5.5 * Math.cos((a * Math.PI) / 180)} cy={45 + 5.5 * Math.sin((a * Math.PI) / 180)} r="0.55" fill="#dde2e8" />
      ))}
    </>
  );
}

// ---------- Le poisson ----------

function Fish() {
  return (
    <>
      <g class="bld-real-bubbles">
        <circle cx="16" cy="44" r="2" />
        <circle cx="13" cy="38" r="1.4" />
        <circle cx="17" cy="32" r="1" />
      </g>
      <g class="bld-real-tail">
        <path d="M64 50L91 33Q85 50 91 67Z" fill="#f77f00" />
        <path d="M70 47L86 38M70 53L86 62M71 50H86" stroke="#e06a00" stroke-width="0.9" stroke-linecap="round" />
      </g>
      <path d="M31 30Q46 16 62 31Z" fill="#f77f00" />
      <defs>
        <clipPath id="bld-fish-body">
          <ellipse cx="45" cy="50" rx="26" ry="21.5" />
        </clipPath>
      </defs>
      <ellipse cx="45" cy="50" rx="26" ry="21.5" fill="#ff9a2e" />
      <g clip-path="url(#bld-fish-body)">
        <ellipse cx="45" cy="64" rx="26" ry="10" fill="#ffb865" />
        <path d="M34 24Q29 50 34 76H41Q36 50 41 24Z" fill="#ffffff" stroke="#2b2b2b" stroke-width="1" />
        <path d="M54 24Q49 50 54 76H60Q55 50 60 24Z" fill="#ffffff" stroke="#2b2b2b" stroke-width="1" />
        <path d="M45 42a4 4 0 0 1 4 4M47 56a4 4 0 0 1 4 4M63 46a4 4 0 0 1 4 4" stroke="#e58a1f" stroke-width="0.8" fill="none" />
      </g>
      <path d="M44 58Q51 62 50 69Q44 65 44 58Z" fill="#f77f00" class="bld-real-fin" />
      <circle cx="28" cy="45" r="5" fill="#ffffff" />
      <circle cx="27" cy="45.5" r="2.8" fill="#1f2a36" class="bld-real-eye" />
      <circle cx="26" cy="44.3" r="0.9" fill="#ffffff" />
      <path d="M19.5 52.5Q22 55 25 53" stroke="#c65a00" stroke-width="1.1" stroke-linecap="round" fill="none" />
    </>
  );
}

// ---------- Le robot ----------

function Robot() {
  return (
    <>
      <ellipse cx="50" cy="95" rx="24" ry="2.5" fill={SHADOW} />
      {/* Jambes */}
      <rect x="36" y="79" width="9" height="11" fill="#7b8794" />
      <rect x="55" y="79" width="9" height="11" fill="#7b8794" />
      <rect x="33" y="88.5" width="14" height="5.5" rx="2.5" fill="#5c6773" />
      <rect x="53" y="88.5" width="14" height="5.5" rx="2.5" fill="#5c6773" />
      {/* Bras gauche (immobile) et bras droit (qui fait coucou) */}
      <g>
        <rect x="17" y="45" width="10" height="28" rx="5" fill="#9aa6b2" />
        <path d="M18.5 74Q18 79 22 79.5M25.5 74Q26 79 22 79.5" stroke="#5c6773" stroke-width="2" stroke-linecap="round" fill="none" />
      </g>
      <g class="bld-real-wave-arm">
        <rect x="73" y="45" width="10" height="28" rx="5" fill="#9aa6b2" />
        <path d="M74.5 74Q74 79 78 79.5M81.5 74Q82 79 78 79.5" stroke="#5c6773" stroke-width="2" stroke-linecap="round" fill="none" />
      </g>
      <circle cx="28" cy="47" r="3" fill="#7b8794" />
      <circle cx="72" cy="47" r="3" fill="#7b8794" />
      {/* Corps */}
      <rect x="30" y="40" width="40" height="40" rx="6" fill="#b8c4cf" />
      <path d="M64 41Q69.5 42 69.5 47V73Q69.5 79 64 79Z" fill="#a3b0bc" />
      <rect x="37" y="47" width="26" height="17" rx="3" fill="#2b3a4a" />
      {['#ff5a66', '#ffd23f', '#4cd08a'].map((c, i) => (
        <circle key={c} cx={43 + i * 7} cy="55.5" r="2.4" fill={c} class="bld-real-blink" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      <path d="M50 76.5l-3.3-3.2a2 2 0 0 1 3.3-2.4a2 2 0 0 1 3.3 2.4Z" fill="#ff5a66" class="bld-real-heart" />
      {/* Cou et tête */}
      <rect x="45" y="37" width="10" height="4" fill="#7b8794" />
      <path d="M50 16V8" stroke="#7b8794" stroke-width="1.6" />
      <circle cx="50" cy="7" r="2.6" fill="#ff5a66" class="bld-real-blink" />
      <circle cx="38" cy="27" r="2.2" fill="#9aa6b2" />
      <circle cx="62" cy="27" r="2.2" fill="#9aa6b2" />
      <rect x="38.5" y="16" width="23" height="22" rx="5" fill="#cfd8e1" />
      {[45, 55].map((x) => (
        <g key={x}>
          <circle cx={x} cy="25.5" r="3.8" fill="#2b3a4a" />
          <circle cx={x} cy="25.5" r="2.2" fill="#5ec0f2" class="bld-real-eye" />
        </g>
      ))}
      <rect x="44" y="31.5" width="12" height="3.4" rx="1.7" fill="#2b3a4a" />
      <path d="M47 31.5v3.4M50 31.5v3.4M53 31.5v3.4" stroke="#7b8794" stroke-width="0.7" />
    </>
  );
}

// ---------- Le bonhomme de neige ----------

function Snowman() {
  return (
    <>
      <defs>
        <radialGradient id="bld-snow" cx="0.38" cy="0.32" r="0.7">
          <stop offset="0.55" stop-color="#ffffff" />
          <stop offset="1" stop-color="#cfe0f1" />
        </radialGradient>
      </defs>
      <g class="bld-real-snow">
        {[
          [8, 10],
          [90, 18],
          [16, 44],
          [86, 52],
          [10, 76],
          [92, 84],
          [74, 6],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </g>
      <ellipse cx="50" cy="96" rx="40" ry="4.5" fill="#f4f9ff" stroke="#d6e6f5" stroke-width="1" />
      {/* Bras en bois */}
      <path d="M34 38L17 27M21 29.5L18 24M21 29.5L15 31" stroke="#6b4516" stroke-width="1.6" stroke-linecap="round" fill="none" />
      <path d="M66 38L83 27M79 29.5L82 24M79 29.5L85 31" stroke="#6b4516" stroke-width="1.6" stroke-linecap="round" fill="none" />
      {/* Boules de neige */}
      <circle cx="50" cy="72" r="25" fill="url(#bld-snow)" />
      <circle cx="50" cy="40" r="18" fill="url(#bld-snow)" />
      <circle cx="50" cy="15" r="11" fill="url(#bld-snow)" />
      {[33, 41, 49, 64, 74].map((y) => (
        <circle key={y} cx="50" cy={y} r="1.6" fill="#2b2b2b" />
      ))}
      {/* Écharpe */}
      <path d="M40 24Q50 29.5 60 24L60.8 28Q50 34 39.2 28Z" fill="#e63946" />
      <path d="M55 28L59 41L54 42L52 29.5Z" fill="#e63946" class="bld-real-scarf" />
      <path d="M40.5 25.8Q50 31 59.8 25.8" stroke="#ffd23f" stroke-width="0.9" fill="none" />
      {/* Visage */}
      <circle cx="46" cy="12" r="1.3" fill="#2b2b2b" />
      <circle cx="54" cy="12" r="1.3" fill="#2b2b2b" />
      <path d="M50 14.5L60 16.8L50 17.8Z" fill="#f77f00" stroke="#f77f00" stroke-width="0.6" stroke-linejoin="round" />
      {[44.5, 47.2, 50, 52.8, 55.5].map((x, i) => (
        <circle key={x} cx={x} cy={i === 0 || i === 4 ? 19.6 : 20.6} r="0.7" fill="#2b2b2b" />
      ))}
      {/* Chapeau */}
      <g class="bld-real-hat">
        <rect x="43.5" y="-8" width="13" height="13" rx="1.6" fill="#2b2b2b" />
        <rect x="43.5" y="0.5" width="13" height="2.6" fill="#e63946" />
        <rect x="39.5" y="4" width="21" height="2.8" rx="1.4" fill="#2b2b2b" />
      </g>
    </>
  );
}

// ---------- Le château ----------

function Castle() {
  return (
    <>
      <ellipse cx="50" cy="90" rx="44" ry="3" fill="#8fbf5f" />
      {/* Drapeaux */}
      {[
        [20, '#e63946'],
        [80, '#ffc300'],
      ].map(([x, c]) => (
        <g key={x as number}>
          <path d={`M${x} 23V9`} stroke="#6b4516" stroke-width="1.2" />
          <path d={`M${x} 9L${(x as number) + 10} 11.5L${x} 14.5Z`} fill={c as string} class="bld-real-flag" />
        </g>
      ))}
      {/* Tours */}
      {[12, 72].map((x) => (
        <g key={x}>
          <rect x={x} y="38" width="16" height="50" fill="#b3b9c1" />
          <path d={stones(x, 38, 16, 50)} stroke="#9aa1ab" stroke-width="0.6" />
          <path d={`M${x + 12} 38V88`} stroke="#a2a9b2" stroke-width="3" />
          <path d={`M${x - 1} 42L${x + 8} 22L${x + 17} 42Z`} fill="#3f6fb5" stroke="#3f6fb5" stroke-width="1.2" stroke-linejoin="round" />
          <path d={`M${x + 3} 36H${x + 13}M${x + 5} 30H${x + 11}`} stroke="#35609d" stroke-width="0.8" />
          <path d={`M${x + 1.5} 40L${x + 7} 27`} stroke="#6d95d0" stroke-width="1.2" stroke-linecap="round" />
          {[52, 68].map((y) => (
            <g key={y}>
              <path d={`M${x + 5} ${y + 7}V${y + 3}a3 3 0 0 1 6 0V${y + 7}Z`} fill="#5a4a3a" />
              <path d={`M${x + 5.8} ${y + 7}V${y + 3.2}a2.2 2.2 0 0 1 4.4 0V${y + 7}Z`} class="bld-real-window" />
            </g>
          ))}
        </g>
      ))}
      {/* Mur principal et créneaux */}
      {[26, 34, 42, 50, 58, 66].map((x) => (
        <rect key={x} x={x} y="46" width="6.5" height="7" fill="#c3c8cf" />
      ))}
      <rect x="25" y="52" width="50" height="36" fill="#c3c8cf" />
      <path d={stones(25, 52, 50, 36)} stroke="#aab0b8" stroke-width="0.6" />
      {[32, 68].map((x) => (
        <g key={x}>
          <path d={`M${x - 3} 66V61a3 3 0 0 1 6 0V66Z`} fill="#5a4a3a" />
          <path d={`M${x - 2.2} 66V61.2a2.2 2.2 0 0 1 4.4 0V66Z`} class="bld-real-window" />
        </g>
      ))}
      {/* Porte à herse */}
      <path d="M41 88V75a9 9 0 0 1 18 0V88Z" fill="#9aa1ab" />
      <path d="M43 88V75a7 7 0 0 1 14 0V88Z" fill="#7a4a22" />
      <path d="M46.5 69.5V88M50 68V88M53.5 69.5V88M43 76H57M43 82H57" stroke="#4e2e12" stroke-width="0.8" />
      <circle cx="50" cy="60" r="3.2" fill="#e63946" />
      <path d="M48.5 60h3M50 58.5v3" stroke="#ffd23f" stroke-width="0.9" />
    </>
  );
}

const DRAWINGS: Record<FigureId, () => JSX.Element> = {
  house: House,
  tree: Tree,
  boat: Boat,
  car: Car,
  rocket: Rocket,
  fish: Fish,
  robot: Robot,
  snowman: Snowman,
  castle: Castle,
};

export function FigureIllustration({ figureId }: { figureId: FigureId }) {
  const Draw = DRAWINGS[figureId];
  return (
    <svg class={`bld-real bld-real--${figureId}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <Draw />
    </svg>
  );
}
