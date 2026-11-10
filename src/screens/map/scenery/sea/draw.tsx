// Dessins de la mer : chacun a son point d'appui en (0, 0) (pied posé au sol ou ligne de flottaison).
// Les emprises correspondantes sont dans plan.ts (SHAPES).
import { PATH_WIDTH, type Point } from '../../layout';
import type { Beam, Place, Prop } from './plan';
import { DECK_R } from './plan';

export const SAND = '#f6e7b8';
export const SAND_WET = '#e8d29a';
export const SAND_DRY = '#fbf1d3';
export const LAGOON = '#d4f6f0';
export const WOOD = '#d29a5c';
export const WOOD_DARK = '#8b5a2b';
export const POST = '#6e4420';
export const WATER_SHADOW = 'rgba(20, 80, 122, 0.24)';
/** Silhouettes sous l'eau. */
export const DEEP_LIFE = '#1d5f96';

/** Eau : lagon clair en bas, bleu du large en haut (de t = 0 à t = 1). */
export const WATER_STOPS: ReadonlyArray<[number, string]> = [
  [0, '#b4ebe8'],
  [0.3, '#8fd9e8'],
  [0.65, '#62bde1'],
  [1, '#3f97cf'],
];

/** Dessins répétés, à référencer avec `<use href="#<pre>…">`. */
export function SeaDefs({ pre }: { pre: string }) {
  const half = PATH_WIDTH / 2;
  const deckLines: string[] = [];
  for (let y = -DECK_R + 9; y < DECK_R - 4; y += 10) {
    const w = Math.sqrt(DECK_R * DECK_R - y * y) - 3;
    deckLines.push(`M${(-w).toFixed(1)} ${y}H${w.toFixed(1)}`);
  }
  return (
    <>
      <g id={`${pre}palm`}>
        <ellipse cx="4" cy="1" rx="17" ry="4.5" fill="#6e5023" opacity="0.2" />
        <path d="M 0 0 Q -2 -24 6 -42" stroke="#8b5a2b" stroke-width="4.6" stroke-linecap="round" fill="none" />
        <path d="M 1 -8 l 3 -1 M 0 -18 l 3 -1 M 1 -28 l 3 -1" stroke="#6b4422" stroke-width="1.4" stroke-linecap="round" />
        <path d="M 6 -42 Q -10 -49 -22 -35 Q -8 -42 6 -42" fill="#4f9d44" />
        <path d="M 6 -42 Q 23 -51 31 -33 Q 19 -42 6 -42" fill="#5fb14f" />
        <path d="M 6 -42 Q 2 -57 -11 -60 Q 2 -51 6 -42" fill="#5fb14f" />
        <path d="M 6 -42 Q 17 -60 29 -56 Q 15 -51 6 -42" fill="#4f9d44" />
        <circle cx="5" cy="-40" r="2.6" fill="#7a4e26" />
        <circle cx="9" cy="-39" r="2.4" fill="#6b4422" />
      </g>
      <path id={`${pre}fish`} d="M -9 0 Q 0 -6 9 0 Q 0 6 -9 0 Z M 8 0 L 14 -5 L 14 5 Z" fill={DEEP_LIFE} />
      <path
        id={`${pre}wave`}
        d="M -15 0 Q -7.5 -6 0 0 Q 7.5 -6 15 0"
        stroke="#ffffff"
        stroke-opacity="0.8"
        stroke-width="2.8"
        stroke-linecap="round"
        fill="none"
      />
      <g id={`${pre}gull`}>
        <ellipse cx="2" cy="16" rx="7" ry="2" fill="#14507a" opacity="0.14" />
        <path d="M -9 -1 Q -4.5 -8 0 -1 Q 4.5 -8 9 -1" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <circle cx="0" cy="-1" r="1.6" fill="#ffffff" />
      </g>
      <g id={`${pre}deck`}>
        <circle cx="3" cy="6" r={DECK_R} fill={WATER_SHADOW} />
        <circle r={DECK_R} fill={WOOD} stroke={WOOD_DARK} stroke-width="4" />
        <path d={deckLines.join('')} stroke={WOOD_DARK} stroke-width="1.5" opacity="0.6" />
      </g>
      <g id={`${pre}landing`}>
        <rect x="-3.5" y={-half - 3} width="7" height={PATH_WIDTH + 6} rx="2.5" fill={WOOD_DARK} />
        <circle cy={-half - 2} r="4.6" fill={POST} />
        <circle cy={half + 2} r="4.6" fill={POST} />
      </g>
      <g id={`${pre}turtle`} fill={DEEP_LIFE}>
        <path d="M 5 -8 Q 15 -21 8 -26 Q -1 -20 -3 -9 Z M 5 8 Q 15 21 8 26 Q -1 20 -3 9 Z" />
        <path d="M -9 -7 Q -15 -15 -21 -12 Q -17 -6 -12 -3 Z M -9 7 Q -15 15 -21 12 Q -17 6 -12 3 Z" />
        <path d="M -13 -2 L -21 0 L -13 2 Z" />
        <ellipse cx="19" cy="0" rx="6.5" ry="5" />
        <ellipse cx="0" cy="0" rx="15" ry="12" />
        <path d="M -5 -6 L 5 -6 L 9 0 L 5 6 L -5 6 L -9 0 Z M -5 -6 L -9 -11 M 5 -6 L 9 -11 M 5 6 L 9 11 M -5 6 L -9 11 M 9 0 L 15 0 M -9 0 L -15 0" fill="none" stroke="#9fd3ee" stroke-width="1.6" stroke-linejoin="round" />
      </g>
    </>
  );
}

function Lighthouse() {
  // Tour qui s'affine : demi-largeur en fonction de la hauteur.
  const w = (y: number) => 13 - ((-y - 12) / 70) * 4;
  const ring = (y0: number, y1: number) => `M ${-w(y0)} ${y0} L ${w(y0)} ${y0} L ${w(y1)} ${y1} L ${-w(y1)} ${y1} Z`;
  return (
    <g>
      <ellipse cx="5" cy="1" rx="34" ry="7" fill="#14507a" opacity="0.2" />
      <path d="M -32 0 Q -31 -14 -16 -17 Q -4 -25 12 -19 Q 30 -16 32 0 Z" fill="#8e9aa5" />
      <path d="M -24 -10 Q -16 -18 -4 -19 Q 8 -21 16 -16" stroke="#b5c0c9" stroke-width="4" stroke-linecap="round" fill="none" />
      <path d={`M -13 -12 L -9 -82 L 9 -82 L 13 -12 Z`} fill="#ffffff" />
      <path d={`M 4 -12 L 3 -82 L 9 -82 L 13 -12 Z`} fill="#e1e8ee" />
      <path d={`${ring(-28, -40)} ${ring(-54, -66)}`} fill="#e63946" />
      <path d="M -5 -12 V -22 Q 0 -28 5 -22 V -12 Z" fill="#5d3a1a" />
      <rect x="-14" y="-86" width="28" height="5" rx="2.5" fill="#5d3a1a" />
      <rect x="-8.5" y="-100" width="17" height="15" fill="#ffe28a" stroke="#5d3a1a" stroke-width="2" />
      <path d="M -12 -100 L 0 -114 L 12 -100 Z" fill="#e63946" />
      <circle cy="-115" r="2.4" fill="#5d3a1a" />
    </g>
  );
}

export function BeamLight({ beam }: { beam: Beam }) {
  const { x, y, dir, len } = beam;
  const ex = x + dir * len;
  const ey = y - len * 0.12;
  return (
    <path
      d={`M ${x} ${y - 4} L ${ex.toFixed(1)} ${(ey - 26).toFixed(1)} Q ${(ex + dir * 8).toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${(ey + 26).toFixed(1)} L ${x} ${y + 4} Z`}
      fill="#fff6b0"
      opacity="0.45"
    />
  );
}

export function Chest({ scale = 1.3, mark = true }: { scale?: number; mark?: boolean }) {
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx="2" cy="2" rx="24" ry="5" fill="#6e5023" opacity="0.22" />
      <rect x="-18" y="-18" width="36" height="20" rx="3" fill="#8b5a2b" />
      <path d="M -18 -18 Q -18 -40 0 -40 Q 18 -40 18 -18 Z" fill="#a06a36" transform="rotate(-24 -18 -18)" />
      <path d="M -15 -18 H 15 L 12 -26 H -12 Z" fill="#ffd23f" />
      <circle cx="-6" cy="-25" r="4" fill="#ffc531" />
      <circle cx="5" cy="-27" r="4.5" fill="#ffe28a" />
      <rect x="-18" y="-10" width="36" height="4" fill="#ffc531" />
      <rect x="-3" y="-13" width="6" height="9" rx="2" fill="#ffc531" stroke="#8b5a2b" stroke-width="1.2" />
      {mark && <path d="M 22 -2 l 6 -6 m -6 0 l 6 6" stroke="#e63946" stroke-width="2.6" stroke-linecap="round" />}
    </g>
  );
}

function Whale() {
  return (
    <g>
      <ellipse cx="2" cy="6" rx="62" ry="22" fill="#1d5f96" opacity="0.4" />
      <path d="M -40 0 Q 4 -40 50 0 Z" fill="#4a7ba6" />
      <path d="M -24 -8 Q 4 -28 34 -10" fill="none" stroke="#6f9bc2" stroke-width="3" stroke-linecap="round" />
      <circle cx="32" cy="-9" r="2.2" fill="#24496b" />
      <path d="M -56 4 Q -72 -16 -84 -8 Q -70 -6 -68 6 Q -80 10 -80 20 Q -64 20 -56 4 Z" fill="#4a7ba6" />
      <path d="M 16 -30 Q 12 -52 2 -58 M 16 -30 Q 20 -52 30 -58 M 16 -30 V -56" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" />
      <circle cx="0" cy="-63" r="3.2" fill="#ffffff" />
      <circle cx="32" cy="-63" r="3.2" fill="#ffffff" />
      <circle cx="16" cy="-62" r="3.2" fill="#ffffff" />
      <path d="M -50 10 Q 4 22 58 8" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.8" />
    </g>
  );
}

function Sailboat() {
  return (
    <g>
      <path d="M -26 10 Q 2 18 30 8" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.8" />
      <g transform="scale(1.35)">
        <ellipse cx="0" cy="7" rx="21" ry="4" fill="#14507a" opacity="0.22" />
        <path d="M -18 -2 L 18 -2 L 12 7 L -12 7 Z" fill="#e63946" />
        <path d="M -18 -2 L 18 -2 L 17 1 L -17 1 Z" fill="#ffffff" />
        <path d="M 0 -2 L 0 -32" stroke="#6e4420" stroke-width="2" />
        <path d="M 2 -30 L 16 -6 L 2 -6 Z" fill="#fff7e8" />
        <path d="M -2 -26 L -12 -6 L -2 -6 Z" fill="#ffd23f" />
      </g>
    </g>
  );
}

function Reef() {
  return (
    <g opacity="0.55">
      <ellipse cx="0" cy="4" rx="38" ry="22" fill="#2f86c2" opacity="0.5" />
      <circle cx="-14" cy="-4" r="13" fill="#ff9aa2" />
      <circle cx="8" cy="6" r="10" fill="#ffb38a" />
      <circle cx="-22" cy="12" r="8" fill="#7fd6c2" />
      <circle cx="14" cy="-10" r="9" fill="#7fd6c2" />
      <circle cx="26" cy="6" r="7" fill="#ff9aa2" />
      <path d="M -2 -10 Q -6 -26 -2 -30 M -2 -10 Q 2 -24 8 -26 M -2 -10 Q -10 -18 -16 -20" stroke="#ff8fab" stroke-width="3" stroke-linecap="round" fill="none" />
    </g>
  );
}

function School({ pre }: { pre: string }) {
  const fish: Array<[number, number, number]> = [
    [0, 0, 1],
    [22, 12, 0.8],
    [-14, 16, 0.9],
    [12, -14, 0.75],
    [-24, -6, 0.7],
  ];
  return (
    <g opacity="0.45">
      {fish.map(([x, y, s]) => (
        <use key={`${x}${y}`} href={`#${pre}fish`} transform={`translate(${x} ${y}) scale(${s})`} />
      ))}
    </g>
  );
}

function Jumper() {
  return (
    <g>
      <path d="M -22 22 Q -4 -22 20 18" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" />
      <g transform="translate(0 -10) rotate(-20)">
        <ellipse cx="0" cy="0" rx="10" ry="5.5" fill="#ff9f43" />
        <path d="M -9 0 L -16 -5 L -16 5 Z" fill="#ff9f43" />
        <circle cx="5" cy="-1" r="1.4" fill="#3d2c1e" />
      </g>
      <ellipse cx="22" cy="20" rx="10" ry="3" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.85" />
    </g>
  );
}

function Buoy() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="12" ry="4" fill="#14507a" opacity="0.25" />
      <path d="M -10 -2 L -6 -22 H 6 L 10 -2 Z" fill="#e63946" />
      <rect x="-7" y="-15" width="14" height="6" fill="#ffffff" />
      <path d="M 0 -22 V -31" stroke="#5d3a1a" stroke-width="2" />
      <circle cy="-33" r="3" fill="#ffd23f" />
      <ellipse cx="0" cy="0" rx="14" ry="4" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.7" />
    </g>
  );
}

export function PlaceDrawing({ place, pre }: { place: Place; pre: string }) {
  const body = (() => {
    switch (place.kind) {
      case 'lighthouse':
        return <Lighthouse />;
      case 'chest':
        return <Chest />;
      case 'whale':
        return <Whale />;
      case 'sailboat':
        return <Sailboat />;
      case 'reef':
        return <Reef />;
      case 'turtle':
        return <use href={`#${pre}turtle`} opacity="0.4" transform="rotate(-20)" />;
      case 'school':
        return <School pre={pre} />;
      case 'jumper':
        return <Jumper />;
      case 'buoy':
        return <Buoy />;
    }
  })();
  return (
    <g transform={`translate(${Math.round(place.x)} ${Math.round(place.y)})${place.flip ? ' scale(-1 1)' : ''}`}>{body}</g>
  );
}

export function PropDrawing({ prop, pre }: { prop: Prop; pre: string }) {
  const t = `translate(${prop.x} ${prop.y}) scale(${prop.flip ? -prop.scale : prop.scale} ${prop.scale})`;
  switch (prop.kind) {
    case 'palm':
      return <use href={`#${pre}palm`} transform={t} />;
    case 'parasol':
      return (
        <g transform={t}>
          <rect x="-20" y="-4" width="30" height="13" rx="3" fill="#7fd6c2" transform="rotate(-10)" />
          <ellipse cx="6" cy="0" rx="16" ry="4" fill="#6e5023" opacity="0.16" />
          <path d="M 0 0 V -38" stroke="#8b5a2b" stroke-width="2.6" stroke-linecap="round" />
          <path d="M -24 -32 Q 0 -60 24 -32 Z" fill="#e63946" />
          <path d="M -8 -32 Q 0 -54 8 -32 Z" fill="#ffffff" />
        </g>
      );
    case 'castle':
      return (
        <g transform={t}>
          <ellipse cx="2" cy="1" rx="18" ry="4" fill="#6e5023" opacity="0.16" />
          <path d="M -14 0 H 14 V -18 H 8 V -24 H 4 V -18 H -4 V -24 H -8 V -18 H -14 Z" fill="#e3c98c" />
          <path d="M -3 0 V -7 Q 0 -10 3 -7 V 0 Z" fill="#c9ab6c" />
          <path d="M 0 -18 V -34" stroke="#8b5a2b" stroke-width="1.6" />
          <path d="M 0 -34 L 10 -30 L 0 -26 Z" fill="#e63946" />
        </g>
      );
    case 'crab':
      return (
        <g transform={t}>
          <path d="M -9 -2 L -15 -8 M 9 -2 L 15 -8 M -8 3 L -14 6 M 8 3 L 14 6" stroke="#ef5b4c" stroke-width="2.4" stroke-linecap="round" />
          <ellipse cx="0" cy="0" rx="9" ry="6" fill="#ef5b4c" />
          <circle cx="-15" cy="-9" r="3" fill="#ef5b4c" />
          <circle cx="15" cy="-9" r="3" fill="#ef5b4c" />
          <circle cx="-3" cy="-3" r="1.3" fill="#3d2c1e" />
          <circle cx="3" cy="-3" r="1.3" fill="#3d2c1e" />
        </g>
      );
    case 'starfish':
      return (
        <path
          transform={`${t} rotate(14)`}
          d="M0 -9 L2.6 -3.2 L9 -2.8 L4 1.3 L5.6 7.5 L0 4 L-5.6 7.5 L-4 1.3 L-9 -2.8 L-2.6 -3.2 Z"
          fill="#ff8a3d"
        />
      );
    case 'shell':
      return (
        <g transform={t}>
          <path d="M -7 0 Q 0 -14 7 0 Z" fill="#ffc2c7" />
          <path d="M 0 0 L 0 -8 M -3 0 L -2 -7 M 3 0 L 2 -7" stroke="#f08a95" stroke-width="1" />
        </g>
      );
  }
}

/** Têtes des pieux du ponton, en un seul tracé (leurs ronds dans l'eau sont dessinés avec le sol). */
export function Posts({ posts }: { posts: readonly Point[] }) {
  if (posts.length === 0) return null;
  const r = 3.6;
  const d = posts.map((p) => `M${(p.x - r).toFixed(1)} ${p.y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('');
  return <path d={d} fill={POST} />;
}
