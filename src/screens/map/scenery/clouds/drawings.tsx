// Nuages : dessins du monde (nuages teintés par le ciel, lieux, château, échelle, mer de nuages).
import { NODE_SIZE, SUMMIT_SPACING, hash01, type Passage, type Point } from '../../layout';
import {
  MOON_R,
  RAINBOW_STRIPE,
  RAINBOW_STRIPES,
  ROCKET_TILT,
  SHOOTING_TAIL,
  SUN_CLOUD,
  SUN_R,
  type Castle,
  type Cloud,
  type Rainbow,
} from './geometry';

// Teintes, du bas de la bande (0, jour) au haut (1, nuit) : [altitude, couleur, opacité ?].
type Stops = ReadonlyArray<readonly [number, string, number?]>;

export const SKY: Stops = [
  [0, '#c4e4fa'],
  [0.08, '#a7d5f5'],
  [0.27, '#b8ddf6'],
  [0.36, '#ffe4c2'],
  [0.45, '#ffcfa8'],
  [0.53, '#fbb2b6'],
  [0.61, '#dc9fca'],
  [0.69, '#9d86d0'],
  [0.79, '#5f57a8'],
  [0.9, '#343b82'],
  [1, '#1d2557'],
];
const CLOUD_BODY: Stops = [
  [0, '#ffffff'],
  [0.3, '#ffffff'],
  [0.4, '#fff3e6'],
  [0.5, '#fff0e4'],
  [0.58, '#ffe5ec'],
  [0.66, '#efdcf4'],
  [0.75, '#d9d4f6'],
  [1, '#c6c1ee'],
];
const CLOUD_SHADE: Stops = [
  [0, '#c2dbf2'],
  [0.3, '#bdd8f0'],
  [0.4, '#f6c3a2'],
  [0.5, '#f2a88e'],
  [0.58, '#ec9daa'],
  [0.66, '#bf8dc6'],
  [0.75, '#8a7ecb'],
  [1, '#5f5aab'],
];
/** Chemin : liseré, ombre portée et milieu, teintés comme les nuages de leur étape. */
const PATH_RIM: Stops = [
  [0, '#b3d2ee'],
  [0.3, '#b0cfec'],
  [0.42, '#f1b49c'],
  [0.55, '#ea9cab'],
  [0.66, '#b996d6'],
  [0.8, '#9c93df'],
  [1, '#a29ce6'],
];
const PATH_SHADOW: Stops = [
  [0, '#3e6f9f', 0.22],
  [0.32, '#3e6f9f', 0.2],
  [0.45, '#b4505e', 0.2],
  [0.66, '#4a2f86', 0.3],
  [1, '#0b1030', 0.4],
];
const PATH_CORE: Stops = [
  [0, '#eaf4fd'],
  [0.32, '#edf5fd'],
  [0.45, '#fff2e8'],
  [0.6, '#fdeef6'],
  [0.72, '#efedff'],
  [1, '#eceaff'],
];

/** Dégradé vertical aux coordonnées de la carte : `bottom` (altitude 0) → `top` (altitude 1). */
export function Gradient({ id, stops, bottom, top }: { id: string; stops: Stops; bottom: number; top: number }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={bottom} x2="0" y2={top}>
      {stops.map(([t, c, o]) => (
        <stop key={t} offset={t} stop-color={c} stop-opacity={o ?? 1} />
      ))}
    </linearGradient>
  );
}

/** Les dégradés du monde : ciel, nuages, chemin. */
export function CloudsDefs({ id, bottom, top }: { id: string; bottom: number; top: number }) {
  const g = { bottom, top };
  return (
    <defs>
      <Gradient id={`${id}sky`} stops={SKY} {...g} />
      <Gradient id={`${id}body`} stops={CLOUD_BODY} {...g} />
      <Gradient id={`${id}shade`} stops={CLOUD_SHADE} {...g} />
      <Gradient id={`${id}rim`} stops={PATH_RIM} {...g} />
      <Gradient id={`${id}pshadow`} stops={PATH_SHADOW} {...g} />
      <Gradient id={`${id}core`} stops={PATH_CORE} {...g} />
      <path id={`${id}spark`} d="M 0 -9 Q 1 -1 9 0 Q 1 1 0 9 Q -1 1 -9 0 Q -1 -1 0 -9 Z" fill="#ffe9a0" />
    </defs>
  );
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/** Disque en sous-chemin, toujours dans le sens horaire (l'union de plusieurs reste pleine). */
export function circleD(cx: number, cy: number, r: number, ry = r): string {
  return `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(ry)} 0 1 1 ${f1(2 * r)} 0a${f1(r)} ${f1(ry)} 0 1 1 ${f1(-2 * r)} 0Z`;
}

function capsuleD(x0: number, x1: number, y0: number, r: number): string {
  return `M${f1(x0)} ${f1(y0)}H${f1(x1)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x1)} ${f1(y0 + 2 * r)}H${f1(x0)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x0)} ${f1(y0)}Z`;
}

/** Les deux formes de nuage (point d'appui au milieu du bas) : bourrelets, base plate, dessous ombré, reflet. */
const SHAPES = [
  {
    puffs: [
      [-13, -12, 10],
      [2, -18, 13],
      [15, -11, 9],
    ],
    base: [-22, 22, -13, 4.5],
    shade: [0, -6, 27, 9],
    light: [-18, -17, -10, -28, 2, -30],
  },
  {
    puffs: [
      [-26, -13, 11],
      [-9, -22, 15],
      [10, -27, 17],
      [28, -15, 12],
    ],
    base: [-36, 36, -14, 5.5],
    shade: [0, -5, 41, 10],
    light: [-21, -27, -15, -38, -2, -39],
  },
] as const;

/** Tracés (ombre, corps, reflet) d'un ensemble de nuages, aux coordonnées de la carte. */
export function cloudPaths(clouds: readonly Cloud[]): { shade: string; body: string; light: string } {
  let shade = '';
  let body = '';
  let light = '';
  for (const c of clouds) {
    const sh = SHAPES[c.shape];
    const m = c.flip ? -1 : 1;
    const X = (x: number) => c.x + x * c.s * m;
    const Y = (y: number) => c.y + y * c.s;
    const [ex, ey, erx, ery] = sh.shade;
    shade += circleD(X(ex), Y(ey), erx * c.s, ery * c.s);
    for (const [px, py, pr] of sh.puffs) body += circleD(X(px), Y(py), pr * c.s);
    const [bx0, bx1, by, br] = sh.base;
    body += capsuleD(Math.min(X(bx0), X(bx1)), Math.max(X(bx0), X(bx1)), Y(by), br * c.s);
    const [lx0, ly0, lx1, ly1, lx2, ly2] = sh.light;
    light += `M${f1(X(lx0))} ${f1(Y(ly0))}Q${f1(X(lx1))} ${f1(Y(ly1))} ${f1(X(lx2))} ${f1(Y(ly2))}`;
  }
  return { shade, body, light };
}

/** Nuages teintés par le ciel de leur altitude (dégradés de la bande). */
export function CloudGroup({ id, clouds, light = true }: { id: string; clouds: readonly Cloud[]; light?: boolean }) {
  if (clouds.length === 0) return null;
  const p = cloudPaths(clouds);
  return (
    <g>
      <path d={p.shade} fill={`url(#${id}shade)`} />
      <path d={p.body} fill={`url(#${id}body)`} />
      {light && <path d={p.light} fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.75" />}
    </g>
  );
}

/** Chemin de nuages : rangées de bourrelets (traits pointillés à bouts ronds), liseré, ombre et milieu lisse. */
export function CloudPathDraw({ id, d }: { id: string; d: string }) {
  const bumps = (width: number, gap: number, offset: number, stroke: string, extra: Record<string, string> = {}) => (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      stroke-width={width}
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray={`0.1 ${gap}`}
      stroke-dashoffset={offset}
      {...extra}
    />
  );
  return (
    <g data-testid="map-cloud-path">
      {bumps(46, 13, 0, `url(#${id}pshadow)`, { transform: 'translate(0 6)' })}
      {bumps(53, 29, 9, `url(#${id}rim)`)}
      {bumps(47, 13, 0, `url(#${id}rim)`)}
      {bumps(49, 29, 9, '#ffffff')}
      {bumps(43, 13, 0, '#ffffff')}
      <path d={d} fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" />
      <path d={d} fill="none" stroke={`url(#${id}core)`} stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  );
}

/** Points d'étoiles (un tracé par éclat). */
export function StarDots({ stars }: { stars: ReadonlyArray<ReadonlyArray<{ x: number; y: number; r: number }>> }) {
  const opacity = [0.45, 0.7, 0.95];
  return (
    <g fill="#ffffff">
      {stars.map((list, k) =>
        list.length ? <path key={k} d={list.map((s) => circleD(s.x, s.y, s.r)).join('')} opacity={opacity[k]} /> : null,
      )}
    </g>
  );
}

const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7'];

/** Arc-en-ciel (sous le chemin, qui passe dessous) ; ses pieds sont des nuages dessinés à part. */
export function RainbowArc({ rb }: { rb: Rainbow }) {
  return (
    <g fill="none">
      <path
        d={`M ${f1(rb.cx - rb.r - 3)} ${rb.y} A ${rb.r + 3} ${rb.r + 3} 0 0 1 ${f1(rb.cx + rb.r + 3)} ${rb.y}`}
        stroke="#ffffff"
        stroke-opacity="0.45"
        stroke-width="6"
      />
      {RAINBOW.slice(0, RAINBOW_STRIPES).map((c, k) => {
        const r = rb.r - RAINBOW_STRIPE * (k + 0.5);
        return (
          <path
            key={c}
            d={`M ${f1(rb.cx - r)} ${rb.y} A ${f1(r)} ${f1(r)} 0 0 1 ${f1(rb.cx + r)} ${rb.y}`}
            stroke={c}
            stroke-width={RAINBOW_STRIPE + 0.6}
          />
        );
      })}
    </g>
  );
}

/** Soleil couchant : halos, disque ; le nuage du soir posé devant lui est dessiné avec les nuages. */
export function Sun({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y)})`}>
      <circle r={SUN_R + 58} fill="#fff4cf" opacity="0.35" />
      <circle r={SUN_R + 28} fill="#ffe2a6" opacity="0.5" />
      <circle r={SUN_R} fill="#ffb04a" />
      <circle r={SUN_R - 9} fill="#ffc35e" />
      <path d={`M ${-SUN_R + 16} -14 A ${SUN_R - 16} ${SUN_R - 16} 0 0 1 -12 ${-SUN_R + 16}`} stroke="#ffe08f" stroke-width="5" stroke-linecap="round" fill="none" />
    </g>
  );
}

/** Le nuage du soir devant le soleil (côté `side` : −1 soleil à gauche, +1 à droite). */
export function sunCloud(at: Point, side: number): Cloud {
  return { x: at.x + SUN_CLOUD.x * side, y: at.y + SUN_CLOUD.y, s: SUN_CLOUD.s, flip: side > 0, shape: 1 };
}

/** Croissant de lune : le disque, privé d'un disque décalé vers le haut à droite. */
function crescentD(r: number): string {
  const r2 = r * 0.84;
  const d = r * 0.46;
  const ux = Math.SQRT1_2;
  const uy = -Math.SQRT1_2;
  const a = (r * r - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r * r - a * a);
  const nx = -uy;
  const ny = ux;
  const P = { x: a * ux + h * nx, y: a * uy + h * ny };
  const Q = { x: a * ux - h * nx, y: a * uy - h * ny };
  const large2 = a - d > 0 ? 1 : 0;
  return `M ${f1(P.x)} ${f1(P.y)} A ${r} ${r} 0 1 1 ${f1(Q.x)} ${f1(Q.y)} A ${f1(r2)} ${f1(r2)} 0 ${large2} 0 ${f1(P.x)} ${f1(P.y)} Z`;
}

export function Moon({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y)})`}>
      <circle r={MOON_R + 34} fill="#fff3c4" opacity="0.08" />
      <circle r={MOON_R + 16} fill="#fff3c4" opacity="0.12" />
      <path d={crescentD(MOON_R)} fill="#fff1bd" />
      <circle cx={-MOON_R * 0.5} cy={MOON_R * 0.18} r="5" fill="#efdc9c" />
      <circle cx={-MOON_R * 0.18} cy={MOON_R * 0.6} r="3.5" fill="#efdc9c" />
      <circle cx={-MOON_R * 0.68} cy={-MOON_R * 0.3} r="2.5" fill="#efdc9c" />
    </g>
  );
}

/** Étoile filante : tête en `at`, traînée vers le haut à droite. */
export function ShootingStar({ id, at }: { id: string; at: Point }) {
  const { x, y } = at;
  const tx = x + SHOOTING_TAIL.x;
  const ty = y + SHOOTING_TAIL.y;
  return (
    <g>
      <path d={`M ${f1(x)} ${f1(y)} L ${f1(tx)} ${f1(ty)}`} stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.4" />
      <path
        d={`M ${f1(x)} ${f1(y)} L ${f1(x + SHOOTING_TAIL.x * 0.45)} ${f1(y + SHOOTING_TAIL.y * 0.45)}`}
        stroke="#ffffff"
        stroke-width="4"
        stroke-linecap="round"
      />
      <use href={`#${id}spark`} transform={`translate(${f1(x)} ${f1(y)}) scale(1.3)`} />
    </g>
  );
}

/** Montgolfière : point d'appui sous la nacelle. */
export function Balloon({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y)})`}>
      <path d="M -14 -44 L -10 -22 M 14 -44 L 10 -22 M -4 -44 L -3 -22 M 4 -44 L 3 -22" stroke="#8b5a2b" stroke-width="1.6" />
      <path d="M -17 -44 Q -38 -66 -34 -90 Q -27 -116 0 -116 Q 27 -116 34 -90 Q 38 -66 17 -44 Z" fill="#ef5350" />
      <path d="M 17 -44 Q 38 -66 34 -90 Q 30 -106 18 -113 Q 30 -84 10 -44 Z" fill="#d84343" />
      <path d="M -7 -44 Q -20 -76 -10 -116 L 10 -116 Q 20 -76 7 -44 Z" fill="#ffd23f" />
      <path d="M -26 -60 Q -36 -80 -30 -98 L -24 -104 Q -30 -80 -18 -52 Z" fill="#ffd23f" opacity="0.9" />
      <path d="M -24 -96 Q -20 -108 -8 -112" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.6" />
      <rect x="-18" y="-48" width="36" height="7" rx="3.5" fill="#c94040" />
      <rect x="-12" y="-24" width="24" height="18" rx="3" fill="#b5793d" />
      <path d="M -12 -18 H 12" stroke="#8b5a2b" stroke-width="2" />
      <path d="M -6 -24 V -6 M 2 -24 V -6" stroke="#9c6630" stroke-width="1.2" opacity="0.7" />
    </g>
  );
}

/** Fusée qui file vers le haut à droite, avec sa flamme et deux bouffées de fumée. */
export function Rocket({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y)}) rotate(${ROCKET_TILT})`}>
      <circle cx="0" cy="80" r="10" fill="#e4e0fb" opacity="0.55" />
      <circle cx="3" cy="97" r="7" fill="#e4e0fb" opacity="0.35" />
      <path d="M -10 26 Q 0 70 10 26 Z" fill="#ffa53d" />
      <path d="M -5 26 Q 0 50 5 26 Z" fill="#ffe28a" />
      <path d="M -15 26 Q -18 -18 0 -42 Q 18 -18 15 26 Z" fill="#f4f6fb" />
      <path d="M 6 26 Q 10 -14 0 -42 Q 18 -18 15 26 Z" fill="#d9dcee" />
      <path d="M -9 -26 Q 0 -45 9 -26 Z" fill="#e63946" />
      <circle cx="0" cy="-6" r="7.5" fill="#7fc8f2" stroke="#3b3f86" stroke-width="3" />
      <circle cx="-2.5" cy="-8.5" r="2.2" fill="#ffffff" opacity="0.8" />
      <path d="M -15 10 L -28 30 L -14 27 Z M 15 10 L 28 30 L 14 27 Z" fill="#e63946" />
      <rect x="-12" y="22" width="24" height="6" rx="3" fill="#b8bcd6" />
    </g>
  );
}

// Château : couleurs de la nuit (il est toujours en haut, près de la lune).
const WALL = '#f6f5ff';
const WALL_SHADE = '#dcd8f6';
const ROOF = '#ef8fb7';
const ROOF_SHADE = '#d26c9e';
const LIT = '#ffe28a';
const GLOW = '#ffe9a8';
const BANK = '#dcd7f7';
const BANK_SHADE = '#7f78c4';

function towerD(x: number, y: number, w: number, h: number) {
  return `M ${x} ${y + h} V ${y} H ${x + w} V ${y + h} Z`;
}

/** Fenêtre en arc éclairée (bas au milieu en (x, y)), avec un halo. */
function ArchWindow({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <circle cx={x} cy={y - h / 2} r={h * 0.9} fill={GLOW} opacity="0.3" />
      <path d={`M ${x - w / 2} ${y} V ${y - h + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y - h + w / 2} V ${y} Z`} fill={LIT} />
    </>
  );
}

/** Château de nuages, la porte au bout du chemin (bas de la porte en `castle.at`). */
export function CastleDraw({ id, castle }: { id: string; castle: Castle }) {
  const { at, front, back } = castle;
  const puffs = (list: ReadonlyArray<{ x: number; y: number; r: number }>, body: string, shade: string) => (
    <>
      <path d={list.map((p) => circleD(p.x + 2, p.y + 6, p.r)).join('')} fill={shade} />
      <path d={list.map((p) => circleD(p.x, p.y, p.r)).join('')} fill={body} />
    </>
  );
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y)})`}>
      {/* Banc de nuages derrière le château. */}
      {puffs(back, BANK, BANK_SHADE)}
      <path d="M -100 -40 Q -86 -56 -70 -58 M 62 -58 Q 76 -60 88 -48" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7" />
      {/* Tours d'angle. */}
      {[-1, 1].map((s) => {
        const x0 = s < 0 ? -86 : 52;
        const cx = x0 + 17;
        return (
          <g key={s}>
            <path d={towerD(x0, -134, 34, 132)} fill={WALL} />
            <path d={towerD(x0 + 24, -134, 10, 132)} fill={WALL_SHADE} />
            <path d={`M ${cx} -184 V -200`} stroke="#b9b2e6" stroke-width="2" stroke-linecap="round" />
            <path d={`M ${cx + 1} -200 L ${cx + 14} -196 L ${cx + 1} -191 Z`} fill={ROOF} />
            <path d={`M ${cx - 23} -130 L ${cx} -184 L ${cx + 23} -130 Z`} fill={ROOF} />
            <path d={`M ${cx} -184 L ${cx + 23} -130 L ${cx} -130 Z`} fill={ROOF_SHADE} />
            <rect x={cx - 24} y="-134" width="48" height="6" rx="3" fill={ROOF_SHADE} />
            <ArchWindow x={cx} y={-88} w={12} h={20} />
          </g>
        );
      })}
      {/* Muraille crénelée. */}
      <path d="M -52 -2 V -96 H -42 V -88 H -32 V -96 H 32 V -88 H 42 V -96 H 52 V -2 Z" fill={WALL} />
      <path d="M -52 -96 H -42 V -88 H -52 Z" fill={WALL_SHADE} opacity="0.6" />
      {/* Donjon. */}
      <path d={towerD(-27, -166, 54, 80)} fill={WALL} />
      <path d={towerD(17, -166, 10, 80)} fill={WALL_SHADE} />
      <path d="M -34 -162 L 0 -220 L 34 -162 Z" fill={ROOF} />
      <path d="M 0 -220 L 34 -162 L 0 -162 Z" fill={ROOF_SHADE} />
      <rect x="-35" y="-167" width="70" height="7" rx="3.5" fill={ROOF_SHADE} />
      <path d="M 0 -219 V -244" stroke="#b9b2e6" stroke-width="2.4" stroke-linecap="round" />
      <path d="M 1.5 -244 L 26 -238 L 17 -233 L 26 -228 L 1.5 -228 Z" fill="#ffd23f" />
      <path d="M 1.5 -233 L 17 -233 L 26 -228 L 1.5 -228 Z" fill="#f4a300" opacity="0.5" />
      {/* Fenêtres éclairées. */}
      <circle cx="0" cy="-130" r="17" fill={GLOW} opacity="0.3" />
      <circle cx="0" cy="-130" r="10" fill={LIT} stroke={WALL_SHADE} stroke-width="3" />
      <path d="M 0 -140 V -120 M -10 -130 H 10" stroke={WALL_SHADE} stroke-width="2" />
      <ArchWindow x={-35} y={-50} w={11} h={17} />
      <ArchWindow x={35} y={-50} w={11} h={17} />
      <use href={`#${id}spark`} transform="translate(0 -68) scale(0.85)" />
      {/* Porte, au bout du chemin. */}
      <path d="M -20 0 V -24 A 20 20 0 0 1 20 -24 V 0 Z" fill="#c9c0ee" />
      <path d="M -15 0 V -24 A 15 15 0 0 1 15 -24 V 0 Z" fill="#7a64b8" />
      <path d="M 0 -39 V 0 M -15 -18 H 15" stroke="#634f9e" stroke-width="2" />
      <circle cx="6" cy="-12" r="2.2" fill="#ffd23f" />
      {/* Banc de nuages devant le pied du château, de part et d'autre de la porte. */}
      {puffs(front, BANK, BANK_SHADE)}
      <path
        d={front
          .filter((p) => p.r > 20)
          .map((p) => `M ${p.x - p.r * 0.6} ${p.y - p.r * 0.45} Q ${p.x - p.r * 0.2} ${p.y - p.r * 0.95} ${p.x + p.r * 0.3} ${p.y - p.r * 0.85}`)
          .join(' ')}
        stroke="#ffffff"
        stroke-width="3"
        stroke-linecap="round"
        fill="none"
        opacity="0.8"
      />
      <use href={`#${id}spark`} transform="translate(-118 -150) scale(0.9)" />
      <use href={`#${id}spark`} transform="translate(120 -112) scale(0.7)" />
      <use href={`#${id}spark`} transform="translate(-50 -214) scale(0.6)" />
    </g>
  );
}

/** Du sommet aux nuages : une échelle de bois dressée sur la pointe, qui file dans la mer de nuages. */
export function Ladder({ passage }: { passage: Passage }) {
  const bottom = SUMMIT_SPACING / 2 - NODE_SIZE / 2 + 6;
  const top = 2;
  const half = 11;
  const rungs = [];
  for (let y = bottom - 10; y > top; y -= 14) {
    rungs.push(
      <g key={y}>
        <path d={`M ${-half} ${y + 2} L ${half} ${y + 2}`} stroke="#6e4420" stroke-width="3.2" stroke-linecap="round" opacity="0.35" />
        <path d={`M ${-half} ${y} L ${half} ${y}`} stroke="#b47a42" stroke-width="3.4" stroke-linecap="round" />
      </g>,
    );
  }
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      <ellipse cx="2" cy={bottom + 2} rx="16" ry="4" fill="rgba(40,50,60,0.2)" />
      {rungs}
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <path d={`M ${sx * half} ${bottom} L ${sx * half} ${top}`} stroke="#7d4f25" stroke-width="5" stroke-linecap="round" />
          <path d={`M ${sx * half - 1} ${bottom - 4} L ${sx * half - 1} ${top + 4}`} stroke="#a8713d" stroke-width="1.6" stroke-linecap="round" />
        </g>
      ))}
    </g>
  );
}

/** Mer de nuages qui barre la carte à la frontière : rangée du fond (`back`) ou de devant. */
export function CloudSea({ passage, width, back }: { passage: Passage; width: number; back: boolean }) {
  const puffs: Array<{ x: number; y: number; r: number }> = [];
  const step = back ? 30 : 25;
  for (let x = -18, k = 0; x < width + 30; x += step, k += 1) {
    const seed = passage.worldIndex * 97 + k + (back ? 500 : 0);
    const r = back ? 22 + hash01(seed + 40) * 12 : 17 + hash01(seed + 40) * 9;
    const y = passage.y + (back ? -14 : 8) + (hash01(seed) - 0.5) * 10;
    puffs.push({ x: x + (hash01(seed + 7) - 0.5) * 8, y, r });
  }
  const shade = back ? '#c3dbf1' : '#cfe2f3';
  const body = back ? '#f3f8fd' : '#ffffff';
  return (
    <g>
      <path d={puffs.map((p) => circleD(p.x, p.y + (back ? 9 : 6), p.r)).join('')} fill={shade} />
      <path d={puffs.map((p) => circleD(p.x, p.y, p.r)).join('')} fill={body} />
      {back && (
        <path
          d={puffs
            .filter((_, i) => i % 2 === 0)
            .map((p) => `M ${f1(p.x - p.r * 0.6)} ${f1(p.y - p.r * 0.4)} Q ${f1(p.x - p.r * 0.2)} ${f1(p.y - p.r * 0.95)} ${f1(p.x + p.r * 0.3)} ${f1(p.y - p.r * 0.85)}`)
            .join(' ')}
          stroke="#ffffff"
          stroke-width="3"
          stroke-linecap="round"
          fill="none"
        />
      )}
    </g>
  );
}

/** Oiseaux (un seul tracé), point d'appui de chacun en (x, y). */
export function Birds({ birds }: { birds: ReadonlyArray<{ x: number; y: number; scale: number; flip: boolean }> }) {
  if (birds.length === 0) return null;
  const d = birds
    .map((b) => {
      const s = b.scale * 1.1;
      const x = b.x;
      const y = b.y - 12;
      return `M ${f1(x - 8 * s)} ${f1(y)} Q ${f1(x - 4 * s)} ${f1(y - 5 * s)} ${f1(x)} ${f1(y)} Q ${f1(x + 4 * s)} ${f1(y - 5 * s)} ${f1(x + 8 * s)} ${f1(y)}`;
    })
    .join(' ');
  return <path d={d} stroke="#4d6a86" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />;
}
