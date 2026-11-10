// Pièces communes du décor de la carte : sentier de terre et ses cailloux, petits dessins (sprites),
// panneau d'entrée, fond d'une partie, outils de tracé. Chaque monde (forest.tsx, sea.tsx…) s'en sert
// à sa guise : aucune règle n'impose le même sentier partout.
import type { FunctionComponent, JSX } from 'preact';
import { emojiUrl } from '../../../ui/emoji';
import {
  BACKDROP_HEIGHT,
  BACKDROP_WIDTH,
  PATH_WIDTH,
  backdropDecor,
  hash01,
  pathStones,
  type Decor,
  type Passage,
  type PathStone,
  type Point,
  type WorldBand,
  type WorldId,
} from '../layout';
import type { SceneContext } from './types';

export const SNOW = '#f7fbfe';
export const SNOW_SHADE = '#dce8f2';
/** Chemin de nuages : bourrelets blancs sur une ombre bleutée. */
export const CLOUD_PATH = '#ffffff';
export const CLOUD_PATH_SHADE = '#cfe2f3';
export const CLOUD_PATH_CORE = '#f1f8fe';
/** Demi-largeur des ouvrages posés sur le chemin (pont, ponton, marches). */
export const DECK_HALF = PATH_WIDTH / 2 + 3;

/** Sentier de terre battue, des mondes de terre (forêt, montagne). Bord plus
 * sombre, milieu tassé plus clair par endroits (tirets irréguliers), cailloux, tas de gravillons, dalles. */
export const PATH_EDGE = '#cfb47f';
export const PATH_FILL = '#e9d4a2';
export const PATH_WORN = '#f4e6c0';
export const PATH_SPECK = '#d6bd8a';
/** Caillou taillé : corps, facette éclairée (pas de reflet brillant, sinon on lit une olive). */
export const ROCK_TONES = [
  ['#c6ad86', '#dcc8a4'],
  ['#b39b77', '#cbb591'],
  ['#d2bd98', '#e6d6b6'],
] as const;
/** Grains des tas : les tons du chemin, un cran plus soutenus pour rester lisibles. */
export const GRAVEL_TONES = ['#b89a63', '#c9ad76', '#a88a55', '#d8c08e', '#bfa36c'] as const;
export const GRAVEL_MOUND = '#d2b77f';
export const SLAB_FILL = '#dcc79a';
export const SLAB_EDGE = '#bfa36c';
export const STONE_SHADOW = 'rgba(110, 80, 35, 0.22)';

/** Contour irrégulier de `n` sommets autour de (cx, cy), aplati en hauteur (vue de trois quarts).
 * Le sommet le plus éloigné est à r × (1 + jitter / 2). */
export function blobD(cx: number, cy: number, r: number, seed: number, n: number, jitter: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + hash01(seed + i) * 0.5;
    const rr = r * (1 - jitter / 2 + hash01(seed + i * 3 + 1) * jitter);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr * 0.72).toFixed(1)}`;
  }
  return `${d}Z`;
}

export function Rock({ rx, tone, seed }: PathStone) {
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

export function Heap({ rx, seed }: PathStone) {
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

export function Slab({ rx, seed }: PathStone) {
  const r = (rx - 0.6) / 1.15;
  return (
    <>
      <path d={blobD(0, 0, r, seed, 8, 0.3)} fill={SLAB_FILL} stroke={SLAB_EDGE} stroke-width="1.2" stroke-linejoin="round" />
      <path d={`M ${-r * 0.5} ${r * 0.15} l ${r * 0.5} ${-r * 0.15}`} stroke={SLAB_EDGE} stroke-width="0.9" stroke-linecap="round" opacity="0.6" />
    </>
  );
}

export function Stone({ stone }: { stone: PathStone }) {
  const { x, y, rotate, kind } = stone;
  const turn = kind === 'heap' ? '' : ` rotate(${rotate})`;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})${turn}`}>
      {kind === 'rock' ? <Rock {...stone} /> : kind === 'heap' ? <Heap {...stone} /> : <Slab {...stone} />}
    </g>
  );
}


export const FLOWER_COLORS = ['#ff8fab', '#ffd23f', '#ffffff', '#b48cf2'];

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
export function WorldSign({ x, y, icon }: { x: number; y: number; icon: string }) {
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
export function groundPatches(band: WorldBand): number[] {
  const out: number[] = [];
  for (let cy = band.top + 200; cy <= band.bottom - 200; cy += 260) out.push(cy);
  return out;
}

/** Bord ondulé d'une bande horizontale, de gauche à droite puis retour. */
export function wavyBandD(width: number, top: number, bottom: number, phase: number): string {
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
export function roomySide(passage: Passage, width: number): number {
  return passage.x < width / 2 ? 1 : -1;
}


/** Points réguliers (pas `step`) le long d'une polyligne, avec la normale en chaque point. */
export function resample(points: readonly Point[], step: number): Array<Point & { nx: number; ny: number }> {
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


/** Sol uni d'une bande, avec de grandes taches plus claires. */
export function FlatGround({ ctx, ground, patch }: { ctx: SceneContext; ground: string; patch: string }) {
  const { band, width } = ctx;
  return (
    <g data-world={band.world}>
      <rect x="0" y={band.top} width={width} height={band.bottom - band.top} fill={ground} />
      {groundPatches(band).map((cy, i) => (
        <ellipse key={i} cx={i % 2 === 0 ? width * 0.22 : width * 0.78} cy={cy} rx={width * 0.34} ry="70" fill={patch} />
      ))}
    </g>
  );
}

/** Cailloux, tas et dalles du sentier de terre dans la bande (jamais sous un niveau ni sur un passage). */
export function bandStones(ctx: SceneContext, keep: (st: PathStone) => boolean = () => true): PathStone[] {
  const passagesHere = [ctx.passageIn, ctx.passageOut].filter((p): p is Passage => p !== null);
  return pathStones(ctx.bandSamples, ctx.nodes, passagesHere).filter(
    (st) => st.y - st.rx > ctx.band.top && st.y + st.rx < ctx.band.bottom && keep(st),
  );
}

/** Sentier de terre battue : ombre, bord, milieu tassé, grains, puis les cailloux posés dessus. */
export function EarthPath({ d, stones }: { d: string; stones: readonly PathStone[] }) {
  return (
    <>
      <path d={d} class="map-scenery__path" stroke="rgba(90, 70, 30, 0.1)" stroke-width={PATH_WIDTH + 6} />
      <path d={d} class="map-scenery__path" stroke={PATH_EDGE} stroke-width={PATH_WIDTH} />
      <path d={d} class="map-scenery__path" stroke={PATH_FILL} stroke-width={PATH_WIDTH - 6} />
      <path d={d} class="map-scenery__path map-scenery__path--worn" stroke={PATH_WORN} stroke-width={PATH_WIDTH - 20} />
      <path d={d} class="map-scenery__path map-scenery__path--specks" stroke={PATH_SPECK} stroke-width="2.2" />
      {stones.map((stone, i) => (
        <Stone key={i} stone={stone} />
      ))}
    </>
  );
}

/** Petits dessins semés (sortie de placeDecor), déjà triés du fond vers l'avant. */
export function DecorLayer({ decor, sprite = Sprite }: { decor: readonly Decor[]; sprite?: FunctionComponent<{ kind: string; seed: number }> }) {
  const Draw = sprite;
  return (
    <>
      {decor.map((item, i) => (
        <g
          key={i}
          transform={`translate(${Math.round(item.x)} ${Math.round(item.y)}) scale(${item.flip ? -item.scale : item.scale} ${item.scale})`}
        >
          <Draw kind={item.kind} seed={i} />
        </g>
      ))}
    </>
  );
}

/** Fond de partie par défaut : sol uni, deux taches, les petits dessins du monde agrandis. */
export function SpriteBackdrop({ world, ground, patch }: { world: WorldId; ground: string; patch: string }) {
  const decor = backdropDecor(world);
  return (
    <>
      <rect x="0" y="0" width={BACKDROP_WIDTH} height={BACKDROP_HEIGHT} fill={ground} />
      <ellipse cx={BACKDROP_WIDTH * 0.2} cy={BACKDROP_HEIGHT * 0.3} rx="170" ry="90" fill={patch} />
      <ellipse cx={BACKDROP_WIDTH * 0.85} cy={BACKDROP_HEIGHT * 0.72} rx="190" ry="100" fill={patch} />
      <DecorLayer decor={decor} />
    </>
  );
}

/** Destination par défaut, quand un monde n'en dessine pas : un poteau et son fanion au bout du chemin. */
export function DefaultEnd({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y)})`} data-testid="map-end">
      <circle r={PATH_WIDTH / 2} fill={PATH_FILL} />
      <path d="M 0 0 L 0 -46" stroke="#6e4420" stroke-width="3" stroke-linecap="round" />
      <path d="M 0 -46 L 26 -38 L 0 -29 Z" fill="#e63946" />
    </g>
  );
}

/** Berge de chaque monde, au bord d'une rivière qui le sépare d'un autre. */
export const BANK: Record<WorldId, string> = {
  forest: '#8fbf5f',
  sea: '#f3e2b0',
  mountain: '#aab5a0',
  clouds: '#ffffff',
};
