// Frontière mer → montagne : des falaises de roche blonde sortent de l'eau, coiffées par l'herbe de
// l'alpage, avec quelques rochers en crête ; le chemin les franchit par un col taillé en marches, entre
// deux gros rochers.
import { hash01, type Passage, type Point } from '../../layout';
import { DECK_HALF } from '../common';
import { MEADOW } from './drawings';

const CLIFF = '#c4b8a4';
const CLIFF_TOP = '#ddd3c1';
const CLIFF_SHADE = '#a39682';
const CLIFF_DEEP = '#8f8270';
const GRASS_LIP = '#a5d27a';
/** Demi-largeur de la brèche du col. */
const GAP = DECK_HALF + 5;
/** Haut de la falaise (sous l'herbe) et pied (dans l'eau), par rapport à la frontière. */
const TOP = -22;
const FOOT = 26;

const r = (n: number) => Math.round(n * 10) / 10;

/** Rocher anguleux de la falaise (crête, piliers du col) : face, dessus éclairé, flanc à l'ombre. */
function Boulder({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) {
  const j = (k: number) => (hash01(seed + k) - 0.5) * 0.16;
  const P = (u: number, v: number, k: number) => `${r(x + (u + j(k)) * w)} ${r(y - (v + j(k + 9)) * h)}`;
  const body = `M ${P(-0.5, 0, 0)} L ${P(-0.52, 0.62, 1)} L ${P(-0.22, 1, 2)} L ${P(0.24, 0.94, 3)} L ${P(0.5, 0.58, 4)} L ${P(0.48, 0, 5)} Z`;
  const lit = `M ${P(-0.52, 0.62, 1)} L ${P(-0.22, 1, 2)} L ${P(0.24, 0.94, 3)} L ${P(0.06, 0.66, 6)} Z`;
  const shade = `M ${P(0.06, 0.66, 6)} L ${P(0.24, 0.94, 3)} L ${P(0.5, 0.58, 4)} L ${P(0.48, 0, 5)} L ${P(0.16, 0, 7)} Z`;
  return (
    <>
      <path d={body} fill={CLIFF} />
      <path d={lit} fill={CLIFF_TOP} />
      <path d={shade} fill={CLIFF_SHADE} />
    </>
  );
}

interface Piece {
  from: number;
  to: number;
}

function CliffPiece({ from, to, seed }: Piece & { seed: number }) {
  const tops: string[] = [];
  const feet: string[] = [];
  for (let x = from, k = 0; x <= to + 0.1; x += (to - from) / Math.max(1, Math.round((to - from) / 12)), k += 1) {
    tops.push(`${r(x)} ${r(TOP + (hash01(seed + k) - 0.5) * 5)}`);
    feet.push(`${r(x)} ${r(FOOT + (hash01(seed + 50 + k) - 0.5) * 6)}`);
  }
  const face = `M ${feet.join(' L ')} L ${tops.reverse().join(' L ')} Z`;
  // Contreforts : une fissure sombre qui descend en biais, la roche éclairée à sa gauche.
  const cracks: string[] = [];
  const lits: string[] = [];
  for (let x = from + 14 + hash01(seed + 3) * 16, k = 0; x < to - 8; x += 26 + hash01(seed + 7 + k) * 22, k += 1) {
    const lean = 3 + hash01(seed + 11 + k) * 5;
    cracks.push(
      `M ${r(x)} ${TOP + 4} L ${r(x + 4)} ${TOP + 4} L ${r(x + 3 + lean)} ${r(FOOT * 0.3)} L ${r(x + 6 + lean)} ${FOOT + 3} L ${r(x - 3 + lean)} ${FOOT + 3} L ${r(x - 1 + lean * 0.6)} ${r(FOOT * 0.3)} Z`,
    );
    lits.push(`M ${r(x - 9)} ${TOP + 6} L ${r(x - 1)} ${TOP + 5} L ${r(x - 2 + lean * 0.6)} ${r(FOOT * 0.3)} L ${r(x - 8 + lean * 0.4)} ${r(FOOT * 0.25)} Z`);
  }
  const strata = `M ${r(from)} ${r(TOP + 24)} ${Array.from({ length: Math.round((to - from) / 30) }, (_, k) => {
    const x = from + k * 30 + 6;
    return `M ${r(x)} ${r(TOP + 23 + hash01(seed + 30 + k) * 5)} l 16 ${r((hash01(seed + 40 + k) - 0.5) * 3)}`;
  }).join(' ')}`;
  return (
    <>
      <path d={face} fill={CLIFF} />
      <path d={lits.join(' ')} fill={CLIFF_TOP} />
      <path d={cracks.join(' ')} fill={CLIFF_SHADE} />
      <path d={strata} stroke={CLIFF_DEEP} stroke-width="1.4" stroke-linecap="round" opacity="0.45" fill="none" />
    </>
  );
}

/** Falaises (sous les chemins). */
export function Cliffs({ passage, width, sign }: { passage: Passage; width: number; sign: Point }) {
  const seed = passage.worldIndex * 131;
  const pieces: Piece[] = [
    { from: -14, to: passage.x - GAP },
    { from: passage.x + GAP, to: width + 14 },
  ].filter((p) => p.to - p.from > 4);
  const lip = ({ from, to }: Piece) => {
    let d = `M ${r(from)} ${TOP + 3}`;
    for (let x = from; x < to; x += 10) {
      const deep = 5 + hash01(seed + Math.round(x)) * 5;
      d += ` Q ${r(x + 5)} ${r(TOP + deep + 3)} ${r(Math.min(to, x + 10))} ${TOP + 3}`;
    }
    return `${d} L ${r(to)} ${TOP - 6} L ${r(from)} ${TOP - 6} Z`;
  };
  const foam = ({ from, to }: Piece) => {
    let d = `M ${r(from)} ${FOOT + 3}`;
    for (let x = from; x < to - 2; x += 12) d += ` q 6 -5 12 0`;
    return d;
  };
  // Rochers de crête, posés sur l'herbe : jamais derrière le panneau ni contre le col.
  const crest: Array<{ x: number; w: number; h: number; k: number }> = [];
  for (let x = 6, k = 0; x < width; x += 46 + hash01(seed + 300 + k) * 40, k += 1) {
    if (Math.abs(x - sign.x) < 44 || Math.abs(x - passage.x) < GAP + 34) continue;
    if (hash01(seed + 200 + k) < 0.35) continue;
    crest.push({ x, w: 22 + hash01(seed + 210 + k) * 16, h: 14 + hash01(seed + 220 + k) * 14, k });
  }
  // Rochers au pied, dans l'écume.
  const feet: Array<{ x: number; w: number; k: number }> = [];
  for (let x = 30, k = 0; x < width; x += 70 + hash01(seed + 400 + k) * 50, k += 1) {
    if (Math.abs(x - passage.x) < GAP + 24) continue;
    feet.push({ x, w: 14 + hash01(seed + 410 + k) * 10, k });
  }
  return (
    <g data-testid="map-border" transform={`translate(0 ${Math.round(passage.y)})`}>
      {pieces.map((p) => (
        <rect key={`w${p.from}`} x={r(p.from)} y={FOOT - 2} width={r(p.to - p.from)} height="13" fill="rgba(20, 60, 100, 0.2)" />
      ))}
      {pieces.map((p, i) => (
        <CliffPiece key={`c${p.from}`} {...p} seed={seed + i * 97} />
      ))}
      {pieces.map((p) => (
        <path key={`l${p.from}`} d={lip(p)} fill={GRASS_LIP} />
      ))}
      <path
        d={pieces.map((p) => `M ${r(p.from)} ${TOP - 6} H ${r(p.to)}`).join(' ')}
        stroke={MEADOW}
        stroke-width="4"
      />
      {crest.map((c) => (
        <Boulder key={`r${c.k}`} x={c.x} y={TOP + 2} w={c.w} h={c.h} seed={seed + c.k * 13} />
      ))}
      {feet.map((f) => (
        <Boulder key={`f${f.k}`} x={f.x} y={FOOT + 6} w={f.w} h={f.w * 0.55} seed={seed + 500 + f.k * 13} />
      ))}
      <path
        d={pieces.map(foam).join(' ')}
        stroke="#ffffff"
        stroke-width="3"
        stroke-linecap="round"
        fill="none"
        opacity="0.85"
      />
    </g>
  );
}

/** Le col : des marches de pierre sur le chemin, entre deux gros rochers (par-dessus les chemins). */
export function Col({ passage }: { passage: Passage }) {
  const half = DECK_HALF - 2;
  const steps = [];
  const n = 5;
  const h = (FOOT + 4 - (TOP - 8)) / n;
  for (let k = 0; k < n; k += 1) {
    const sy = FOOT + 4 - k * h;
    steps.push(
      <g key={k}>
        <rect x={-half} y={r(sy - h)} width={half * 2} height={r(h)} rx="2" fill="#e6dfd2" />
        <rect x={-half} y={r(sy - 3.5)} width={half * 2} height="3.5" fill="#b9ad99" />
      </g>,
    );
  }
  const seed = passage.worldIndex * 17;
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      <rect x={-half - 2} y={TOP - 10} width={half * 2 + 4} height={FOOT - TOP + 16} rx="3" fill="#cbbfab" />
      {steps}
      <Boulder x={-GAP - 6} y={FOOT + 4} w={24} h={FOOT - TOP + 22} seed={seed} />
      <Boulder x={GAP + 6} y={FOOT + 4} w={24} h={FOOT - TOP + 16} seed={seed + 40} />
      {/* Un cairn sur le rocher de gauche : le sentier continue là-haut. */}
      <g transform={`translate(${-GAP - 8} ${TOP - 16})`}>
        <ellipse cx="0" cy="-2" rx="7" ry="3" fill="#a3afba" />
        <ellipse cx="0.5" cy="-6.5" rx="5.5" ry="2.6" fill="#c3ccd4" />
        <ellipse cx="0" cy="-10.5" rx="3.5" ry="2.2" fill="#a3afba" />
      </g>
    </g>
  );
}
