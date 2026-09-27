// Décor de la carte : sol de chaque monde, passage entre deux mondes (pont, ponton, col),
// éléments dessinés (arbres, vagues, sommets…) et chemin crème.
// Un seul SVG en pixels, sous les niveaux ; purement décoratif.
import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import { emojiUrl } from '../../ui/emoji';
import {
  PASSAGE_HALF,
  PATH_WIDTH,
  buildRoute,
  hash01,
  MOUNTAIN_ROCK_FROM,
  MOUNTAIN_SNOW_FROM,
  altitude,
  mountainKindsAt,
  mountainShape,
  type MountainShape,
  passages,
  pathStones,
  placeDecor,
  samplePath,
  signPosition,
  smoothPathD,
  trackHeightFor,
  worldBands,
  type Passage,
  type PathStone,
  type Decor,
  type Point,
  type WorldBand,
  type WorldId,
} from './layout';
import { WORLD_META } from './worlds';

interface WorldTheme {
  ground: string;
  patch: string;
  /** Berge qui borde la rivière, côté de ce monde. */
  bank: string;
}

export const THEMES: Record<WorldId, WorldTheme> = {
  forest: {
    ground: '#b5d98a',
    patch: '#c4e39c',
    bank: '#8fbf5f',
  },
  sea: {
    ground: '#8ecfe8',
    patch: '#a3daee',
    bank: '#f3e2b0',
  },
  mountain: {
    ground: '#cbdcae',
    patch: '#dbe7c4',
    bank: '#aab5a0',
  },
  clouds: {
    ground: '#bfe3fa',
    patch: '#d3edfd',
    bank: '#ffffff',
  },
};

/** Étages de la montagne, du pied au sommet (voir MOUNTAIN_ZONES), et ciel autour des flancs. */
const MOUNTAIN_STOPS: Array<[number, string]> = [
  [0, '#cbdcae'],
  [MOUNTAIN_ROCK_FROM - 0.06, '#c9d8ab'],
  [MOUNTAIN_ROCK_FROM + 0.06, '#bfc2b6'],
  [MOUNTAIN_SNOW_FROM - 0.04, '#aeb8c2'],
  [1, '#c3ccd5'],
];
const MOUNTAIN_SKY_TOP = '#bfe3fa';
const MOUNTAIN_SKY_LOW = '#e4f3fc';
const SNOW = '#f7fbfe';
const SNOW_SHADE = '#dce8f2';
/** Chemin de nuages : bourrelets blancs sur une ombre bleutée. */
const CLOUD_PATH = '#ffffff';
const CLOUD_PATH_SHADE = '#cfe2f3';
const CLOUD_PATH_CORE = '#f1f8fe';

const RIVER_FILL = '#4aa3d4';
const RIVER_HALF = 22;
const BANK_WIDTH = 9;
const BRIDGE_HALF = 36;
/** Demi-largeur des ouvrages posés sur le chemin (pont, ponton, marches). */
const DECK_HALF = PATH_WIDTH / 2 + 3;

/** Sentier de terre battue, identique dans tous les mondes : le repère qui ne change pas. Bord plus
 * sombre, milieu tassé plus clair par endroits (tirets irréguliers), cailloux, tas de gravillons, dalles. */
const PATH_EDGE = '#cfb47f';
const PATH_FILL = '#e9d4a2';
const PATH_WORN = '#f4e6c0';
const PATH_SPECK = '#d6bd8a';
/** Caillou taillé : corps, facette éclairée (pas de reflet brillant, sinon on lit une olive). */
const ROCK_TONES = [
  ['#c6ad86', '#dcc8a4'],
  ['#b39b77', '#cbb591'],
  ['#d2bd98', '#e6d6b6'],
] as const;
/** Grains des tas : les tons du chemin, un cran plus soutenus pour rester lisibles. */
const GRAVEL_TONES = ['#b89a63', '#c9ad76', '#a88a55', '#d8c08e', '#bfa36c'] as const;
const GRAVEL_MOUND = '#d2b77f';
const SLAB_FILL = '#dcc79a';
const SLAB_EDGE = '#bfa36c';
const STONE_SHADOW = 'rgba(110, 80, 35, 0.22)';

/** Contour irrégulier de `n` sommets autour de (cx, cy), aplati en hauteur (vue de trois quarts).
 * Le sommet le plus éloigné est à r × (1 + jitter / 2). */
function blobD(cx: number, cy: number, r: number, seed: number, n: number, jitter: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + hash01(seed + i) * 0.5;
    const rr = r * (1 - jitter / 2 + hash01(seed + i * 3 + 1) * jitter);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr * 0.72).toFixed(1)}`;
  }
  return `${d}Z`;
}

function Rock({ rx, tone, seed }: PathStone) {
  const r = rx / 1.225;
  const [body, facet] = ROCK_TONES[tone];
  return (
    <>
      <path d={blobD(0.8, 1.2, r, seed, 6, 0.45)} fill={STONE_SHADOW} />
      <path d={blobD(0, 0, r, seed, 6, 0.45)} fill={body} />
      <path d={blobD(-r * 0.2, -r * 0.22, r * 0.55, seed, 6, 0.45)} fill={facet} />
    </>
  );
}

function Heap({ rx, seed }: PathStone) {
  const r = rx / 1.2;
  const grains: { x: number; y: number; k: number }[] = [];
  const n = Math.round(r * 2.6);
  for (let k = 0; k < n; k += 1) {
    const u = hash01(seed + k * 3);
    const v = hash01(seed + k * 3 + 1);
    grains.push({ x: (u * 2 - 1) * r * (1 - v * 0.55), y: r * 0.25 - v * r * 0.95, k });
  }
  // Du bas vers le haut : les grains du sommet recouvrent ceux de la base.
  grains.sort((a, b) => b.y - a.y);
  return (
    <>
      <ellipse cx="0.8" cy={r * 0.35} rx={r * 1.15} ry={r * 0.45} fill={STONE_SHADOW} />
      <path d={`M ${-r * 1.1} ${r * 0.3} Q 0 ${-r * 1.1} ${r * 1.1} ${r * 0.3} Z`} fill={GRAVEL_MOUND} />
      {grains.map(({ x, y, k }) => (
        <path
          key={k}
          d={blobD(x, y, 0.7 + hash01(seed + k * 7) * 1.1, seed + k * 11, 5, 0.5)}
          fill={GRAVEL_TONES[Math.floor(hash01(seed + k * 5) * GRAVEL_TONES.length)]}
        />
      ))}
      {[0, 1, 2].map((k) => {
        const a = hash01(seed + 90 + k) * Math.PI * 2;
        const dist = r * 1.1 + hash01(seed + 95 + k) * (rx - r * 1.1 - 0.7);
        return (
          <circle key={`e${k}`} cx={Math.cos(a) * dist} cy={Math.sin(a) * dist * 0.5} r="0.7" fill={GRAVEL_TONES[0]} />
        );
      })}
    </>
  );
}

function Slab({ rx, seed }: PathStone) {
  const r = (rx - 0.6) / 1.15;
  return (
    <>
      <path d={blobD(0, 0, r, seed, 8, 0.3)} fill={SLAB_FILL} stroke={SLAB_EDGE} stroke-width="1.2" stroke-linejoin="round" />
      <path d={`M ${-r * 0.5} ${r * 0.15} l ${r * 0.5} ${-r * 0.15}`} stroke={SLAB_EDGE} stroke-width="0.9" stroke-linecap="round" opacity="0.6" />
    </>
  );
}

function Stone({ stone }: { stone: PathStone }) {
  const { x, y, rotate, kind } = stone;
  const turn = kind === 'heap' ? '' : ` rotate(${rotate})`;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})${turn}`}>
      {kind === 'rock' ? <Rock {...stone} /> : kind === 'heap' ? <Heap {...stone} /> : <Slab {...stone} />}
    </g>
  );
}

const FLOWER_COLORS = ['#ff8fab', '#ffd23f', '#ffffff', '#b48cf2'];

/** Chaque sprite est dessiné avec son point d'appui au sol en (0, 0). */
export function Sprite({ kind, seed }: { kind: string; seed: number }): JSX.Element | null {
  switch (kind) {
    case 'tree':
      return (
        <g>
          <ellipse cx="0" cy="0" rx="22" ry="6" fill="rgba(40,60,20,0.18)" />
          <rect x="-4" y="-22" width="8" height="22" rx="3" fill="#8b5a2b" />
          <circle cx="-12" cy="-30" r="14" fill="#4f9d44" />
          <circle cx="12" cy="-30" r="14" fill="#4f9d44" />
          <circle cx="0" cy="-42" r="17" fill="#5fb14f" />
          <circle cx="-5" cy="-47" r="6" fill="#86cc6a" />
        </g>
      );
    case 'pine':
      return (
        <g>
          <ellipse cx="0" cy="0" rx="16" ry="5" fill="rgba(40,60,20,0.18)" />
          <rect x="-3" y="-10" width="6" height="10" rx="2" fill="#7a4e26" />
          <path d="M -18 -8 L 0 -34 L 18 -8 Z" fill="#2f7d4f" />
          <path d="M -15 -22 L 0 -46 L 15 -22 Z" fill="#378a57" />
          <path d="M -11 -36 L 0 -58 L 11 -36 Z" fill="#43995f" />
        </g>
      );
    case 'bush':
      return (
        <g>
          <ellipse cx="0" cy="0" rx="18" ry="4" fill="rgba(40,60,20,0.16)" />
          <circle cx="-9" cy="-8" r="9" fill="#58a646" />
          <circle cx="9" cy="-8" r="9" fill="#58a646" />
          <circle cx="0" cy="-14" r="11" fill="#67b853" />
          <circle cx="4" cy="-12" r="2" fill="#e63946" />
          <circle cx="-6" cy="-7" r="2" fill="#e63946" />
        </g>
      );
    case 'mushroom':
      return (
        <g>
          <rect x="-3" y="-10" width="6" height="10" rx="3" fill="#fff7e8" />
          <path d="M -10 -9 Q 0 -24 10 -9 Z" fill="#e63946" />
          <circle cx="-3" cy="-14" r="1.8" fill="#fff" />
          <circle cx="4" cy="-12" r="1.5" fill="#fff" />
        </g>
      );
    case 'flower': {
      const color = FLOWER_COLORS[seed % FLOWER_COLORS.length];
      return (
        <g>
          <path d="M 0 0 L 0 -10" stroke="#4f9d44" stroke-width="2" stroke-linecap="round" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={Math.cos((a * Math.PI) / 180) * 3.5}
              cy={-12 + Math.sin((a * Math.PI) / 180) * 3.5}
              r="2.6"
              fill={color}
            />
          ))}
          <circle cx="0" cy="-12" r="2" fill="#f4a300" />
        </g>
      );
    }
    case 'grass':
      return (
        <path
          d="M -6 0 Q -6 -6 -9 -10 M 0 0 Q 0 -8 1 -13 M 6 0 Q 6 -6 9 -9"
          stroke="#6aa84f"
          stroke-width="2.4"
          stroke-linecap="round"
          fill="none"
        />
      );
    case 'wave':
      return (
        <path
          d="M -16 0 Q -8 -7 0 0 Q 8 -7 16 0"
          stroke="#ffffff"
          stroke-opacity="0.75"
          stroke-width="3"
          stroke-linecap="round"
          fill="none"
        />
      );
    case 'island':
      return (
        <g>
          <ellipse cx="0" cy="-2" rx="32" ry="10" fill="#f3e2b0" />
          <ellipse cx="0" cy="-4" rx="26" ry="7" fill="#f8ebc4" />
          <path d="M 2 -6 Q 0 -28 8 -44" stroke="#8b5a2b" stroke-width="4" stroke-linecap="round" fill="none" />
          <path d="M 8 -44 Q -8 -50 -18 -38 Q -6 -44 8 -44" fill="#4f9d44" />
          <path d="M 8 -44 Q 24 -52 30 -36 Q 20 -44 8 -44" fill="#5fb14f" />
          <path d="M 8 -44 Q 4 -58 -8 -60 Q 4 -52 8 -44" fill="#5fb14f" />
          <path d="M 8 -44 Q 18 -60 28 -56 Q 16 -52 8 -44" fill="#4f9d44" />
        </g>
      );
    case 'fish':
      return (
        <g>
          <ellipse cx="0" cy="-6" rx="9" ry="5" fill="#ff9f43" />
          <path d="M 8 -6 L 15 -11 L 15 -1 Z" fill="#ff9f43" />
          <circle cx="-4" cy="-7" r="1.4" fill="#3d2c1e" />
        </g>
      );
    case 'rock':
      return (
        <g>
          <ellipse cx="0" cy="0" rx="15" ry="4" fill="rgba(40,50,60,0.15)" />
          <path d="M -14 0 Q -14 -14 -2 -16 Q 12 -17 14 0 Z" fill="#a3adb5" />
          <path d="M -8 -10 Q -4 -14 2 -14" stroke="#c4ccd2" stroke-width="3" stroke-linecap="round" fill="none" />
        </g>
      );
    case 'shell':
      return (
        <g>
          <path d="M -7 0 Q 0 -14 7 0 Z" fill="#ffc2c7" />
          <path d="M 0 0 L 0 -8 M -3 0 L -2 -7 M 3 0 L 2 -7" stroke="#f08a95" stroke-width="1" />
        </g>
      );
    case 'peak':
      // Grand pic : face éclairée, face à l'ombre, calotte de neige en dents de scie, un pic cadet derrière.
      return (
        <g>
          <path d="M 4 0 L 40 -70 L 70 0 Z" fill="#a9b7c4" />
          <path d="M 40 -70 L 70 0 L 50 0 Z" fill="#91a1b1" />
          <path d="M 30 -51 L 40 -70 L 50 -50 L 44 -54 L 39 -47 L 35 -54 Z" fill={SNOW} />
          <ellipse cx="-4" cy="0" rx="50" ry="6" fill="rgba(40,50,60,0.16)" />
          <path d="M -48 0 L -6 -110 L 40 0 Z" fill="#9fafbf" />
          <path d="M -6 -110 L 40 0 L 10 0 L -2 -60 Z" fill="#8193a6" />
          <path d="M -6 -110 L -2 -60 L -20 -40 Z" fill="#b4c1cd" />
          <path
            d="M -22 -70 L -6 -110 L 11 -68 L 4 -74 L -1 -64 L -7 -76 L -13 -66 L -17 -74 Z"
            fill={SNOW}
          />
          <path d="M -6 -110 L 11 -68 L 4 -74 L -1 -64 L -3 -90 Z" fill={SNOW_SHADE} />
        </g>
      );
    case 'crag':
    case 'snowcrag': {
      // Rocher anguleux : trois faces (dessus éclairé, flanc, flanc à l'ombre), jamais une bosse lisse.
      const snowy = kind === 'snowcrag';
      return (
        <g>
          <ellipse cx="1" cy="0" rx="17" ry="4" fill="rgba(40,50,60,0.18)" />
          <path d="M -16 0 L -12 -12 L -3 -21 L 8 -17 L 15 -6 L 13 0 Z" fill="#8f9ca8" />
          <path d="M -12 -12 L -3 -21 L 8 -17 L 1 -10 Z" fill="#c3ccd4" />
          <path d="M 1 -10 L 8 -17 L 15 -6 L 13 0 L 4 0 Z" fill="#76838f" />
          <path d="M -16 0 L -12 -12 L 1 -10 L 4 0 Z" fill="#a3afba" />
          {snowy && <path d="M -12 -12 L -3 -21 L 8 -17 L 3 -13 L -2 -15 L -7 -11 Z" fill={SNOW} />}
        </g>
      );
    }
    case 'drift':
      return (
        <g>
          <path d="M -18 0 Q -14 -9 -4 -8 Q 2 -15 10 -9 Q 18 -8 18 0 Z" fill={SNOW_SHADE} />
          <path d="M -15 -2 Q -12 -8 -4 -7 Q 2 -13 9 -8 Q 15 -7 15 -2 Z" fill={SNOW} />
        </g>
      );
    case 'cloud':
      return (
        <g>
          <ellipse cx="0" cy="-8" rx="27" ry="9" fill={CLOUD_PATH_SHADE} />
          <circle cx="-13" cy="-12" r="10" fill={CLOUD_PATH} />
          <circle cx="2" cy="-18" r="13" fill={CLOUD_PATH} />
          <circle cx="15" cy="-11" r="9" fill={CLOUD_PATH} />
          <rect x="-22" y="-12" width="44" height="8" rx="4" fill={CLOUD_PATH} />
        </g>
      );
    case 'star':
      return (
        <path
          d="M 0 -16 Q 1.5 -9.5 7 -8 Q 1.5 -6.5 0 0 Q -1.5 -6.5 -7 -8 Q -1.5 -9.5 0 -16 Z"
          fill="#ffd23f"
          stroke="#f4a300"
          stroke-width="0.8"
          stroke-linejoin="round"
        />
      );
    case 'bird':
      return (
        <path
          d="M -8 -14 Q -4 -18 0 -13 Q 4 -18 8 -14"
          stroke="#5b6b7a"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
      );
    case 'balloon':
      // Montgolfière : enveloppe à côtes, nacelle suspendue ; elle flotte, son ombre reste au « sol ».
      return (
        <g>
          <ellipse cx="0" cy="0" rx="10" ry="3" fill="rgba(60,90,130,0.15)" />
          <path d="M -5 -14 L -7 -22 M 5 -14 L 7 -22" stroke="#8b5a2b" stroke-width="1" />
          <rect x="-6" y="-15" width="12" height="7" rx="2" fill="#a86a32" />
          <path d="M -8 -22 Q -18 -34 -16 -44 Q -12 -56 0 -56 Q 12 -56 16 -44 Q 18 -34 8 -22 Z" fill="#e63946" />
          <path d="M -3 -22 Q -9 -38 -5 -56 L 5 -56 Q 9 -38 3 -22 Z" fill="#ffd23f" />
          <path d="M -12 -48 Q -10 -54 -4 -55" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6" />
        </g>
      );
    case 'rainbow':
      return (
        <g fill="none" stroke-width="3.2" stroke-linecap="round">
          {['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7'].map((c, k) => (
            <path key={c} d={`M ${-24 + k * 3.2} -4 A ${24 - k * 3.2} ${22 - k * 3.2} 0 0 1 ${24 - k * 3.2} -4`} stroke={c} />
          ))}
          <g stroke="none" fill={CLOUD_PATH}>
            <circle cx="-24" cy="-4" r="6" />
            <circle cx="-17" cy="-3" r="5" />
            <circle cx="24" cy="-4" r="6" />
            <circle cx="17" cy="-3" r="5" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

/** Panneau de bois à l'entrée de chaque monde. */
function WorldSign({ x, y, icon }: { x: number; y: number; icon: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="14" ry="4" fill="rgba(40,40,20,0.18)" />
      <rect x="-3" y="-30" width="6" height="30" rx="2" fill="#8b5a2b" />
      <rect x="-24" y="-58" width="48" height="34" rx="8" fill="#c68a4e" stroke="#8b5a2b" stroke-width="3" />
      <image
        href={emojiUrl(icon)}
        x={-11}
        y={-56}
        width={22}
        height={22}
        class="map-scenery__sign-icon"
        aria-hidden="true"
      />
    </g>
  );
}

/** Taches de sol plus claires, tenues loin des bords de bande pour ne pas être coupées au raccord. */
function groundPatches(band: WorldBand): number[] {
  const out: number[] = [];
  for (let cy = band.top + 200; cy <= band.bottom - 200; cy += 260) out.push(cy);
  return out;
}

/** Bord ondulé d'une bande horizontale, de gauche à droite puis retour. */
function wavyBandD(width: number, top: number, bottom: number, phase: number): string {
  const step = 24;
  let d = `M -4 ${top}`;
  for (let x = 0; x <= width + step; x += step) {
    d += ` L ${x} ${Math.round((top + Math.sin(x / 37 + phase) * 3) * 10) / 10}`;
  }
  for (let x = Math.ceil((width + step) / step) * step; x >= 0; x -= step) {
    d += ` L ${x} ${Math.round((bottom + Math.sin(x / 41 + phase * 2) * 3) * 10) / 10}`;
  }
  return `${d} L -4 ${bottom} Z`;
}

/** Côté (−1 gauche, +1 droite) où il y a le plus de place autour d'un passage : celui du panneau. */
function roomySide(passage: Passage, width: number): number {
  return passage.x < width / 2 ? 1 : -1;
}

/** Vers la forêt : rivière qui traverse la carte, bordée des berges de chaque monde. */
function River({ passage, width, below }: { passage: Passage; width: number; below: WorldId }) {
  const { y } = passage;
  const top = y - RIVER_HALF;
  const bottom = y + RIVER_HALF;
  const ripples = [];
  for (let x = 30 + (passage.worldIndex % 3) * 17; x < width; x += 74) {
    if (Math.abs(x - passage.x) < BRIDGE_HALF + 20) continue;
    const dy = ((x / 74) % 2 < 1 ? -7 : 6) + y;
    ripples.push(
      <path key={x} d={`M ${x - 9} ${dy} Q ${x} ${dy - 5} ${x + 9} ${dy}`} stroke="#ffffff" stroke-opacity="0.7" />,
    );
  }
  return (
    <g data-testid="map-border">
      <path d={wavyBandD(width, top - BANK_WIDTH, y, passage.worldIndex)} fill={THEMES[passage.world].bank} />
      <path d={wavyBandD(width, y, bottom + BANK_WIDTH, passage.worldIndex + 1)} fill={THEMES[below].bank} />
      <path d={wavyBandD(width, top, bottom, passage.worldIndex + 2)} fill={RIVER_FILL} />
      <g fill="none" stroke-width="2.5" stroke-linecap="round">
        {ripples}
      </g>
    </g>
  );
}

/** Vers la mer : la terre finit sur une plage, l'écume marque le bord de l'eau. */
function Shore({ passage, width }: { passage: Passage; width: number }) {
  const { y } = passage;
  return (
    <g data-testid="map-border">
      <path d={wavyBandD(width, y - 18, y - 2, passage.worldIndex)} fill="#b3e2f2" />
      <path d={wavyBandD(width, y - 4, y + 26, passage.worldIndex + 1)} fill={THEMES.sea.bank} />
      <path
        d={wavyBandD(width, y - 4, y - 4, passage.worldIndex + 1).replace(/ L -4 [^Z]*Z$/, '')}
        fill="none"
        stroke="#ffffff"
        stroke-width="3"
        stroke-linecap="round"
        stroke-opacity="0.9"
      />
    </g>
  );
}

/** Vers la montagne : une crête rocheuse barre la carte, le chemin passe par une brèche. */
function Ridge({ passage, width }: { passage: Passage; width: number }) {
  const { y } = passage;
  const gap = DECK_HALF + 12;
  const pieces: Array<[number, number]> = [
    [-6, passage.x - gap],
    [passage.x + gap, width + 6],
  ];
  return (
    <g data-testid="map-border">
      {pieces.map(([from, to]) => {
        const tops: Point[] = [];
        const snow: string[] = [];
        const n = Math.max(2, Math.round((to - from) / 26));
        for (let k = 0; k <= n; k += 1) {
          const x = from + ((to - from) * k) / n;
          const high = (k + passage.worldIndex + Math.round(from)) % 3 === 0;
          const peak = k === 0 || k === n ? y - 18 : y - (high ? 44 : 28) - ((k * 7) % 5);
          tops.push({ x, y: peak });
          if (high && k > 0 && k < n) snow.push(`M ${x - 7} ${peak + 9} L ${x} ${peak} L ${x + 7} ${peak + 9} Z`);
        }
        const d =
          `M ${from} ${y + 14} ` +
          tops.map((t) => `L ${Math.round(t.x)} ${Math.round(t.y)}`).join(' ') +
          ` L ${to} ${y + 14} Z`;
        return (
          <g key={from}>
            <path d={d} fill="#9aa6b0" />
            <path d={`M ${from} ${y + 14} L ${to} ${y + 14} L ${to} ${y + 4} L ${from} ${y + 4} Z`} fill="#8594a1" />
            {snow.map((sd) => (
              <path key={sd} d={sd} fill="#ffffff" />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Pont de bois qui enjambe la rivière. */
function BridgeSprite({ passage }: { passage: Passage }) {
  const half = DECK_HALF;
  const lines = [];
  for (let k = 1; k < 8; k += 1) {
    const ly = -BRIDGE_HALF + (k * BRIDGE_HALF * 2) / 8;
    lines.push(<path key={k} d={`M ${-half} ${ly} L ${half} ${ly}`} stroke="#8b5a2b" stroke-width="1.6" />);
  }
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      <rect
        x={-half - 4}
        y={-RIVER_HALF + 2}
        width={half * 2 + 8}
        height={RIVER_HALF * 2}
        rx="6"
        fill="rgba(20,50,80,0.22)"
      />
      <rect x={-half} y={-BRIDGE_HALF} width={half * 2} height={BRIDGE_HALF * 2} rx="4" fill="#c68a4e" />
      {lines}
      <rect x={-half - 5} y={-BRIDGE_HALF - 2} width="8" height={BRIDGE_HALF * 2 + 4} rx="3" fill="#8b5a2b" />
      <rect x={half - 3} y={-BRIDGE_HALF - 2} width="8" height={BRIDGE_HALF * 2 + 4} rx="3" fill="#8b5a2b" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <circle key={`${sx}${sy}`} cx={sx * (half + 1)} cy={sy * (BRIDGE_HALF + 1)} r="6" fill="#6e4420" />
        )),
      )}
    </g>
  );
}

/** Ponton de bois qui part de la plage et avance dans la mer ; une barque est amarrée à côté. */
function PierSprite({ passage, width }: { passage: Passage; width: number }) {
  const half = DECK_HALF;
  const top = -PASSAGE_HALF;
  const bottom = 14;
  const side = -roomySide(passage, width);
  const lines = [];
  for (let ly = bottom - 8; ly > top; ly -= 8) {
    lines.push(<path key={ly} d={`M ${-half} ${ly} L ${half} ${ly}`} stroke="#8b5a2b" stroke-width="1.5" />);
  }
  const posts = [-6, -25, top + 2];
  const boatX = side * (half + 34);
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      {posts.flatMap((py) =>
        [-1, 1].map((sx) => (
          <ellipse
            key={`r${py}${sx}`}
            cx={sx * (half + 1)}
            cy={py + 3}
            rx="9"
            ry="3"
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.7"
            stroke-width="1.5"
          />
        )),
      )}
      <rect x={-half + 3} y={top + 5} width={half * 2} height={bottom - top - 5} rx="3" fill="rgba(20,50,80,0.2)" />
      <rect x={-half} y={top} width={half * 2} height={bottom - top} rx="3" fill="#c68a4e" />
      {lines}
      {posts.flatMap((py) =>
        [-1, 1].map((sx) => <circle key={`${py}${sx}`} cx={sx * (half + 1)} cy={py} r="5" fill="#6e4420" />),
      )}
      <g transform={`translate(${boatX} -18)`}>
        {/* Amarre jusqu'au poteau du milieu du ponton. */}
        <path
          d={`M ${-side * 14} -2 Q ${-side * 24} 3 ${-side * 33} -7`}
          stroke="#8b5a2b"
          stroke-width="1.2"
          fill="none"
        />
        <ellipse cx="0" cy="8" rx="20" ry="4" fill="rgba(20,50,80,0.2)" />
        <path d="M -18 -2 L 18 -2 L 12 8 L -12 8 Z" fill="#e63946" />
        <path d="M -18 -2 L 18 -2 L 17 1 L -17 1 Z" fill="#ffffff" />
        <path d="M 0 -2 L 0 -30" stroke="#6e4420" stroke-width="2" />
        <path d="M 2 -28 L 16 -6 L 2 -6 Z" fill="#fff7e8" />
      </g>
    </g>
  );
}

/** Col de montagne : marches de pierre sur le chemin, entre deux piliers à fanion. */
function PassSprite({ passage }: { passage: Passage }) {
  const half = DECK_HALF - 3;
  const steps = [];
  for (let k = 0; k < 6; k += 1) {
    const sy = 22 - k * 12;
    steps.push(
      <g key={k}>
        <rect x={-half} y={sy - 10} width={half * 2} height="10" rx="2" fill="#d6dbe0" />
        <path d={`M ${-half} ${sy} L ${half} ${sy}`} stroke="#9aa4ad" stroke-width="2" />
      </g>,
    );
  }
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      {steps}
      {[-1, 1].map((sx) => {
        const cx = sx * (DECK_HALF + 9);
        return (
          <g key={sx}>
            <ellipse cx={cx} cy="16" rx="12" ry="4" fill="rgba(40,50,60,0.2)" />
            <rect x={cx - 8} y="-40" width="16" height="56" rx="5" fill="#8e99a3" />
            <rect x={cx - 8} y="-40" width="6" height="56" rx="3" fill="#a7b1ba" />
            <path d={`M ${cx - 8} -34 Q ${cx} -46 ${cx + 8} -34 Z`} fill="#ffffff" />
            <path d={`M ${cx} -40 L ${cx} -62`} stroke="#6e4420" stroke-width="2" />
            <path d={`M ${cx} -62 L ${cx + sx * 14} -57 L ${cx} -52 Z`} fill="#e63946" />
          </g>
        );
      })}
    </g>
  );
}

/** Montagne : le ciel autour, un massif qui se resserre jusqu'au sommet, étagé de la prairie à la neige. */
function MountainGround({ band, shape, width }: { band: WorldBand; shape: MountainShape; width: number }) {
  const id = `mountain-${band.worldIndex}`;
  const { rows } = shape;
  const r = (n: number) => Math.round(n * 10) / 10;
  // Bords un peu rocheux : de petites aspérités, toujours vers l'extérieur (le chemin reste dégagé).
  const bump = (i: number) => hash01(band.worldIndex * 1009 + i) * 6;
  const outline =
    `M ${rows.map((row, i) => `${r(row.left - bump(i))} ${r(row.y)}`).join(' L ')} ` +
    `L ${rows
      .map((row, i) => `${r(row.right + bump(i + 500))} ${r(row.y)}`)
      .reverse()
      .join(' L ')} Z`;
  const flank = rows.filter((row) => row.right < width + 20 && altitude(band, row.y) > 0.25);
  const shade =
    flank.length > 1
      ? `M ${flank.map((row) => `${r(row.right)} ${r(row.y)}`).join(' L ')} L ${flank
          .map((row) => `${r(row.right - 30)} ${r(row.y)}`)
          .reverse()
          .join(' L ')} Z`
      : '';
  // Couloirs : quelques traits obliques qui descendent des flancs, pour la texture de la roche.
  const couloirs: string[] = [];
  rows.forEach((row, i) => {
    if (i % 8 !== 3 || altitude(band, row.y) < MOUNTAIN_ROCK_FROM) return;
    const len = 26 + hash01(band.worldIndex * 13 + i) * 20;
    if (row.left > -10) couloirs.push(`M ${r(row.left + 3)} ${r(row.y)} l ${r(len * 0.7)} ${r(len)}`);
    if (row.right < width + 10) couloirs.push(`M ${r(row.right - 3)} ${r(row.y + 20)} l ${r(-len * 0.7)} ${r(len)}`);
  });
  // Sommets lointains, derrière le massif (il les recouvre : jamais sur le chemin). Ils se dressent
  // haut au-dessus des flancs, de part et d'autre, pour que la montagne paraisse immense.
  const farPeaks = [0.36, 0.5, 0.64].flatMap((t, k) => {
    const row = rows.find((rw) => altitude(band, rw.y) <= t);
    if (!row) return [];
    const onLeft = (k + band.worldIndex) % 2 === 0;
    const edge = onLeft ? row.left : row.right;
    if (edge < -30 || edge > width + 30) return [];
    const heightPx = 250 + hash01(band.worldIndex * 7 + k) * 90;
    const half = heightPx * 0.55;
    return [{ x: edge + (onLeft ? -half * 0.3 : half * 0.3), y: row.y + 30, h: heightPx, half, key: k }];
  });
  const snowY = band.bottom - MOUNTAIN_SNOW_FROM * (band.bottom - band.top);
  let snow = `M -80 ${r(band.top - 2)} L ${width + 80} ${r(band.top - 2)}`;
  for (let x = width + 80, k = 0; x >= -80; x -= 16, k += 1) {
    snow += ` L ${x} ${r(snowY + (k % 2 === 0 ? 10 : -4) + hash01(band.worldIndex * 71 + k) * 6)}`;
  }
  snow += ' Z';
  return (
    <g data-world={band.world}>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1={band.top} x2="0" y2={band.bottom}>
          <stop offset="0" stop-color={MOUNTAIN_SKY_TOP} />
          <stop offset="1" stop-color={MOUNTAIN_SKY_LOW} />
        </linearGradient>
        <linearGradient id={`${id}-rock`} gradientUnits="userSpaceOnUse" x1="0" y1={band.bottom} x2="0" y2={band.top}>
          {MOUNTAIN_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stop-color={color} />
          ))}
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      <rect x="0" y={band.top} width={width} height={band.bottom - band.top} fill={`url(#${id}-sky)`} />
      {farPeaks.map(({ x, y, h, half, key }) => {
        const tx = x;
        const ty = y - h;
        const cap = h * 0.26;
        return (
          <g key={key}>
            <path d={`M ${r(x - half)} ${r(y)} L ${r(tx)} ${r(ty)} L ${r(x + half)} ${r(y)} Z`} fill="#b3c2d0" />
            <path d={`M ${r(tx)} ${r(ty)} L ${r(x + half)} ${r(y)} L ${r(x + half * 0.2)} ${r(y)} Z`} fill="#9fb0c1" />
            <path
              d={`M ${r(tx - cap * 0.62)} ${r(ty + cap)} L ${r(tx)} ${r(ty)} L ${r(tx + cap * 0.62)} ${r(ty + cap)} L ${r(
                tx + cap * 0.3,
              )} ${r(ty + cap * 0.8)} L ${r(tx)} ${r(ty + cap * 1.05)} L ${r(tx - cap * 0.3)} ${r(ty + cap * 0.8)} Z`}
              fill={SNOW}
            />
          </g>
        );
      })}
      <path d={outline} fill={`url(#${id}-rock)`} />
      <g clip-path={`url(#${id}-clip)`}>
        {groundPatches(band)
          .filter((cy) => altitude(band, cy) < MOUNTAIN_ROCK_FROM)
          .map((cy, i) => (
            <ellipse
              key={i}
              cx={i % 2 === 0 ? width * 0.22 : width * 0.78}
              cy={cy}
              rx={width * 0.34}
              ry="70"
              fill={THEMES.mountain.patch}
            />
          ))}
        {shade && <path d={shade} fill="rgba(60, 75, 95, 0.12)" />}
        {couloirs.map((c) => (
          <path key={c} d={c} stroke="rgba(60, 75, 95, 0.16)" stroke-width="3" stroke-linecap="round" fill="none" />
        ))}
        <path d={snow} fill={SNOW} />
      </g>
    </g>
  );
}

/** Vers les nuages : le sommet perce une mer de nuages qui barre la carte. Dessinée par-dessus le
 * chemin, pour que le sentier de terre s'y enfonce et en ressorte en nuage. */
function CloudSea({ passage, width }: { passage: Passage; width: number }) {
  const puffs = [];
  for (let x = -16, k = 0; x < width + 30; x += 24, k += 1) {
    const seed = passage.worldIndex * 97 + k;
    puffs.push({ x, y: passage.y + (hash01(seed) - 0.5) * 10, r: 17 + hash01(seed + 40) * 9 });
  }
  return (
    <g data-testid="map-border">
      {puffs.map((p) => (
        <circle key={`s${p.x}`} cx={p.x} cy={p.y + 6} r={p.r} fill={CLOUD_PATH_SHADE} />
      ))}
      {puffs.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r={p.r} fill={CLOUD_PATH} />
      ))}
    </g>
  );
}

/** Sommet : un fanion planté au bord du chemin, juste sous la mer de nuages. */
function SummitSprite({ passage, width }: { passage: Passage; width: number }) {
  const side = roomySide(passage, width);
  const cx = side * (DECK_HALF + 10);
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      <g transform={`translate(${cx} 46)`}>
        <ellipse cx="0" cy="0" rx="11" ry="3.5" fill="rgba(40,50,60,0.2)" />
        <path d="M -9 0 L -7 -6 L 7 -6 L 9 0 Z" fill="#8f9ca8" />
        <path d="M -5 -6 L -4 -11 L 5 -11 L 6 -6 Z" fill="#a3afba" />
        <path d="M 0 -11 L 0 -40" stroke="#6e4420" stroke-width="2.2" stroke-linecap="round" />
        <path d={`M 0 -40 L ${side * 16} -35 L 0 -29 Z`} fill="#e63946" />
      </g>
    </g>
  );
}

/** Points réguliers (pas `step`) le long d'une polyligne, avec la normale en chaque point. */
function resample(points: readonly Point[], step: number): Array<Point & { nx: number; ny: number }> {
  const out: Array<Point & { nx: number; ny: number }> = [];
  let carry = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    for (let d = carry; d < len; d += step) {
      out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len, nx, ny });
    }
    carry = (carry - len) % step;
    if (carry < 0) carry += step;
  }
  return out;
}

/** Chemin de nuages : des bourrelets blancs de part et d'autre, un cœur lisse, une ombre bleutée. */
function CloudPath({ d, samples }: { d: string; samples: readonly Point[] }) {
  const half = PATH_WIDTH / 2;
  const puffs = resample(samples, 12).flatMap((p, i) =>
    [-1, 1].map((side) => {
      const r = 7 + hash01(i * 2 + (side > 0 ? 1 : 0)) * 4;
      const off = half - r * 0.55;
      return { x: p.x + p.nx * off * side, y: p.y + p.ny * off * side, r, key: `${i}${side}` };
    }),
  );
  return (
    <>
      {puffs.map((p) => (
        <circle key={`s${p.key}`} cx={p.x.toFixed(1)} cy={(p.y + 3.5).toFixed(1)} r={p.r.toFixed(1)} fill={CLOUD_PATH_SHADE} />
      ))}
      {puffs.map((p) => (
        <circle key={p.key} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(1)} fill={CLOUD_PATH} />
      ))}
      <path d={d} class="map-scenery__path" stroke={CLOUD_PATH} stroke-width={PATH_WIDTH - 8} />
      <path d={d} class="map-scenery__path map-scenery__path--worn" stroke={CLOUD_PATH_CORE} stroke-width={PATH_WIDTH - 22} />
    </>
  );
}

interface Props {
  count: number;
  width: number;
}

export function MapScenery({ count, width }: Props) {
  const scene = useMemo(() => {
    const height = trackHeightFor(count);
    const route = buildRoute(count, width);
    const samples = samplePath(route.points);
    const nodes = route.nodeAt.map((k) => route.points[k] as Point);
    const bands = worldBands(count).map((band) => {
      const sign = signPosition(band, width, count);
      const shape = band.world === 'mountain' ? mountainShape(band, width, samples, nodes) : null;
      return {
        band,
        sign,
        shape,
        decor: placeDecor(band, width, samples, [...nodes, sign], shape ? mountainKindsAt(band, shape) : undefined),
      };
    });
    const passageList = passages(count, width);
    const cloudBands = bands.filter(({ band }) => band.world === 'clouds').map(({ band }) => band);
    const inClouds = (y: number) => cloudBands.some((band) => y >= band.top && y <= band.bottom);
    return {
      height,
      d: smoothPathD(route.points),
      // Bourrelets du chemin de nuages : seulement là où il y en a (le reste serait masqué).
      cloudSamples: samples.filter((p) => cloudBands.some((band) => p.y >= band.top - 30 && p.y <= band.bottom + 30)),
      bands,
      passages: passageList,
      cloudBands,
      earthBands: bands.filter(({ band }) => band.world !== 'clouds').map(({ band }) => band),
      // Pas de cailloux sur un chemin de nuages (marge : leur emprise ne déborde pas sur la frontière).
      stones: pathStones(samples, nodes, passageList).filter((st) => !inClouds(st.y - st.rx) && !inClouds(st.y + st.rx)),
    };
  }, [count, width]);

  if (count === 0 || width <= 0) return null;
  const { height, d, bands } = scene;
  const hasClouds = scene.cloudBands.length > 0;

  return (
    <svg
      class="map-scenery"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      data-testid="map-scenery"
    >
      {bands.map(({ band, shape }) =>
        shape ? (
          <MountainGround key={`ground-${band.worldIndex}`} band={band} shape={shape} width={width} />
        ) : (
        <g key={`ground-${band.worldIndex}`} data-world={band.world}>
          <rect x="0" y={band.top} width={width} height={band.bottom - band.top} fill={THEMES[band.world].ground} />
          {groundPatches(band).map((cy, i) => (
            <ellipse
              key={i}
              cx={i % 2 === 0 ? width * 0.22 : width * 0.78}
              cy={cy}
              rx={width * 0.34}
              ry="70"
              fill={THEMES[band.world].patch}
            />
          ))}
        </g>
        ),
      )}
      {scene.passages.map((passage) => {
        const key = `border-${passage.worldIndex}`;
        if (passage.kind === 'pier') return <Shore key={key} passage={passage} width={width} />;
        if (passage.kind === 'pass') return <Ridge key={key} passage={passage} width={width} />;
        if (passage.kind === 'summit') return null; // mer de nuages : dessinée par-dessus le chemin
        const below = (bands[passage.worldIndex - 1] as { band: WorldBand }).band.world;
        return <River key={key} passage={passage} width={width} below={below} />;
      })}

      {hasClouds && (
        <defs>
          <clipPath id="map-earth-clip">
            {scene.earthBands.map((band) => (
              <rect key={band.worldIndex} x="-50" y={band.top} width={width + 100} height={band.bottom - band.top} />
            ))}
          </clipPath>
          <clipPath id="map-cloud-clip">
            {scene.cloudBands.map((band) => (
              <rect key={band.worldIndex} x="-50" y={band.top} width={width + 100} height={band.bottom - band.top} />
            ))}
          </clipPath>
        </defs>
      )}
      <g clip-path={hasClouds ? 'url(#map-earth-clip)' : undefined}>
        <path d={d} class="map-scenery__path" stroke="rgba(90, 70, 30, 0.1)" stroke-width={PATH_WIDTH + 6} />
        <path d={d} class="map-scenery__path" stroke={PATH_EDGE} stroke-width={PATH_WIDTH} />
        <path d={d} class="map-scenery__path" stroke={PATH_FILL} stroke-width={PATH_WIDTH - 6} />
        <path d={d} class="map-scenery__path map-scenery__path--worn" stroke={PATH_WORN} stroke-width={PATH_WIDTH - 20} />
        <path d={d} class="map-scenery__path map-scenery__path--specks" stroke={PATH_SPECK} stroke-width="2.2" />
      </g>
      {hasClouds && (
        <g clip-path="url(#map-cloud-clip)" data-testid="map-cloud-path">
          <CloudPath d={d} samples={scene.cloudSamples} />
        </g>
      )}
      {scene.stones.map((stone, i) => (
        <Stone key={i} stone={stone} />
      ))}

      {scene.passages.map((passage) => {
        const key = `passage-${passage.worldIndex}`;
        if (passage.kind === 'pier') return <PierSprite key={key} passage={passage} width={width} />;
        if (passage.kind === 'pass') return <PassSprite key={key} passage={passage} />;
        if (passage.kind === 'summit') {
          return (
            <g key={key}>
              <CloudSea passage={passage} width={width} />
              <SummitSprite passage={passage} width={width} />
            </g>
          );
        }
        return <BridgeSprite key={key} passage={passage} />;
      })}

      {bands.map(({ band, sign, decor }) => (
        <g key={`decor-${band.worldIndex}`}>
          {decor.map((item: Decor, i) => (
            <g
              key={i}
              transform={`translate(${Math.round(item.x)} ${Math.round(item.y)}) scale(${
                item.flip ? -item.scale : item.scale
              } ${item.scale})`}
            >
              <Sprite kind={item.kind} seed={i} />
            </g>
          ))}
          <WorldSign x={sign.x} y={sign.y} icon={WORLD_META[band.world].icon} />
        </g>
      ))}
    </svg>
  );
}
