// Nuages : placement (pur et déterministe) des lieux, des bancs de nuages, du petit décor et des étoiles.
// Le ciel se lit à l'altitude dans la bande : jour (bas), coucher de soleil, nuit (haut).
import {
  NODE_SIZE,
  PATH_WIDTH,
  altitude,
  clearOfRoute,
  findSpot,
  hash01,
  overlaps,
  placeDecor,
  type Decor,
  type DecorKind,
  type Footprint,
  type Point,
} from '../../layout';
import type { SceneContext } from '../types';

/** Fin du jour et début de la nuit (altitude dans la bande). */
export const DAY_END = 0.33;
export const NIGHT_FROM = 0.64;

/** Arc-en-ciel : cinq bandes de STRIPE px, le rayon donné est celui de la bande extérieure. */
export const RAINBOW_STRIPES = 5;
export const RAINBOW_STRIPE = 8;
const RAINBOW_THICK = RAINBOW_STRIPES * RAINBOW_STRIPE;
/** Pied de l'arc-en-ciel : un gros nuage (forme 1) posé sous le bout des bandes. */
export const RAINBOW_FOOT_S = 1.1;

/** Pieds de l'arc-en-ciel : les deux nuages où il se pose. */
export function rainbowFeet(rb: Rainbow): Cloud[] {
  return [-1, 1].map((side) => ({
    x: rb.cx + side * (rb.r - RAINBOW_THICK / 2),
    y: rb.y + 16,
    s: RAINBOW_FOOT_S,
    flip: side > 0,
    shape: 1 as const,
  }));
}

/** Emprise d'un nuage dessiné (forme 0 : un disque ; forme 1, plus large : deux disques). */
export function cloudDisks(c: Cloud): Footprint[] {
  if (c.shape === 0) return [{ x: c.x, y: c.y - 13 * c.s, r: 26 * c.s }];
  return [-1, 1].map((k) => ({ x: c.x + k * 18 * c.s, y: c.y - 19 * c.s, r: 25 * c.s }));
}

export interface Rainbow {
  cx: number;
  /** Ligne des pieds. */
  y: number;
  r: number;
}

/** Un nuage dessiné : point d'appui (milieu du bas), échelle, miroir, forme. */
export interface Cloud {
  x: number;
  y: number;
  s: number;
  flip: boolean;
  shape: 0 | 1;
}

export interface Castle {
  at: Point;
  /** Bourrelets du banc de nuages devant le château (relatifs à la porte), ceux qui laissent le chemin libre. */
  front: Footprint[];
  /** Bourrelets du banc derrière le château (relatifs à la porte). */
  back: Footprint[];
  footprints: Footprint[];
}

export interface CloudsPrep {
  /** Préfixe des identifiants SVG. */
  id: string;
  rainbow: Rainbow | null;
  /** Soleil couchant, au bord gauche (side −1) ou droit (+1). */
  sun: (Point & { side: number }) | null;
  moon: Point | null;
  balloon: Point | null;
  rocket: Point | null;
  shooting: Point | null;
  castle: Castle | null;
  /** Grands bancs de nuages au bord de l'écran (des masses, pas du semis). */
  banks: Cloud[];
  /** Petits nuages semés. */
  clouds: Cloud[];
  birds: Decor[];
  sparks: Decor[];
  /** Points d'étoiles, en trois éclats (du plus pâle au plus vif). */
  stars: Array<Array<{ x: number; y: number; r: number }>>;
  footprints: Footprint[];
}

// Emprises relatives au point d'appui de chaque lieu.
/** Montgolfière : enveloppe, nacelle (point d'appui sous la nacelle). */
export const BALLOON_SHAPE: Footprint[] = [
  { x: 0, y: -80, r: 38 },
  { x: 0, y: -18, r: 18 },
];
/** Soleil couchant (centre du disque) et le gros nuage du soir posé devant lui. */
export const SUN_R = 46;
export const SUN_CLOUD = { x: 22, y: 66, s: 1.7 };
const sunShape = (side: number): Footprint[] => [
  { x: 0, y: 0, r: SUN_R + 2 },
  { x: SUN_CLOUD.x * side, y: SUN_CLOUD.y - 22, r: 44 },
];
export const MOON_R = 38;
const MOON_SHAPE: Footprint[] = [{ x: 0, y: 0, r: MOON_R + 6 }];
/** Fusée (centre du corps), avec sa traînée vers le bas à gauche. */
export const ROCKET_TILT = 30;
const ROCKET_SHAPE: Footprint[] = [
  { x: 0, y: 0, r: 44 },
  { x: -30, y: 52, r: 16 },
  { x: -42, y: 74, r: 14 },
];
/** Étoile filante : tête en (0, 0), traînée vers le haut à droite. */
export const SHOOTING_TAIL = { x: 78, y: -34 };
const SHOOTING_SHAPE: Footprint[] = [0, 0.33, 0.66, 1].map((k) => ({ x: SHOOTING_TAIL.x * k, y: SHOOTING_TAIL.y * k, r: 12 }));
/** Grand banc de nuages (forme 1) au bord de l'écran. */
const BANK_SCALE = 1.7;

/** Château de nuages, relatif à la porte (bas de la porte en (0, 0)). */
const CASTLE_BODY: Footprint[] = [
  { x: 0, y: -150, r: 62 },
  { x: -68, y: -96, r: 36 },
  { x: 68, y: -96, r: 36 },
  { x: -36, y: -46, r: 24 },
  { x: 36, y: -46, r: 24 },
];
/** Banc de nuages derrière le château (dépasse de part et d'autre des tours). */
const CASTLE_BACK: Footprint[] = [
  { x: -104, y: -14, r: 24 },
  { x: -80, y: -32, r: 30 },
  { x: 80, y: -32, r: 30 },
  { x: 104, y: -14, r: 24 },
];
/** Banc devant le pied du château, de part et d'autre de la porte. */
const CASTLE_FRONT: Footprint[] = [
  { x: -126, y: 2, r: 20 },
  { x: -100, y: -2, r: 25 },
  { x: -70, y: 4, r: 22 },
  { x: -44, y: 8, r: 17 },
  { x: 44, y: 8, r: 17 },
  { x: 70, y: 4, r: 22 },
  { x: 100, y: -2, r: 25 },
  { x: 126, y: 2, r: 20 },
];

const shift = (shape: readonly Footprint[], p: Point): Footprint[] => shape.map((f) => ({ x: p.x + f.x, y: p.y + f.y, r: f.r }));

const KINDS_DAY: DecorKind[] = [
  { kind: 'cloud', radius: 26, weight: 3 },
  { kind: 'bird', radius: 20, weight: 2.2 },
  { kind: '', radius: 26, weight: 6 },
];
const KINDS_DUSK: DecorKind[] = [
  { kind: 'cloud', radius: 26, weight: 3 },
  { kind: '', radius: 26, weight: 6 },
];
const KINDS_NIGHT: DecorKind[] = [
  { kind: 'cloud', radius: 26, weight: 1.8 },
  { kind: 'spark', radius: 10, weight: 3 },
  { kind: '', radius: 26, weight: 5 },
];

/** Arc-en-ciel : le chemin entre entre ses deux pieds et ressort par l'arc, qui ne passe sous aucun niveau. */
function findRainbow(ctx: SceneContext, obstacles: readonly Point[], yFrom: number, yTo: number, taken: readonly Footprint[]): Rainbow | null {
  const { width, bandSamples } = ctx;
  const prefer = (yFrom + yTo) / 2;
  const ys: number[] = [];
  for (let y = Math.round(yTo); y <= yFrom; y += 8) ys.push(y);
  ys.sort((a, b) => Math.abs(a - prefer) - Math.abs(b - prefer) || a - b);
  const radii = [0.38, 0.42, 0.34, 0.3].map((k) => Math.round(width * k));
  const shifts = [0, -15, 15, -30, 30, -45, 45, -60, 60];
  for (const r of radii) {
    for (const y of ys) {
      for (const dx of shifts) {
        const cx = width / 2 + dx;
        const feetAt = rainbowFeet({ cx, y, r });
        // Un pied peut déborder de l'écran, d'un tiers de sa largeur au plus.
        if (feetAt.some((c) => c.x < 18 || c.x > width - 18)) continue;
        const feet = feetAt.flatMap(cloudDisks);
        if (!feet.every((f) => clearOfRoute(f, bandSamples, obstacles))) continue;
        if (overlaps(feet, taken)) continue;
        // Le chemin passe bien entre les deux pieds.
        if (!bandSamples.some((p) => Math.abs(p.y - y) < 10 && p.x > cx - r && p.x < cx + r)) continue;
        // L'arc (moitié haute) ne passe sous aucun niveau ni sous le panneau.
        const mid = r - RAINBOW_THICK / 2;
        const hidden = obstacles.some(
          (n) => n.y < y + NODE_SIZE / 2 && Math.abs(Math.hypot(n.x - cx, n.y - y) - mid) < RAINBOW_THICK / 2 + NODE_SIZE / 2 + 12,
        );
        if (hidden) continue;
        // L'arc ne croise le chemin qu'en passant dessous : pas d'autre lieu sur lui.
        if (overlaps(arcDisks({ cx, y, r }), taken)) continue;
        return { cx, y, r };
      }
    }
  }
  return null;
}

/** Disques qui couvrent l'arc-en-ciel (pour en tenir écartés les autres lieux et le décor). */
export function arcDisks(rb: Rainbow): Footprint[] {
  const out: Footprint[] = [];
  const mid = rb.r - RAINBOW_THICK / 2;
  const n = Math.ceil((Math.PI * mid) / 26);
  for (let k = 1; k < n; k += 1) {
    const a = Math.PI + (Math.PI * k) / n;
    out.push({ x: rb.cx + Math.cos(a) * mid, y: rb.y + Math.sin(a) * mid, r: RAINBOW_THICK / 2 + 4 });
  }
  return out;
}

/** Château : bourrelets de devant qui laissent le chemin libre (sauf à la porte, où il aboutit). */
function castleAt(ctx: SceneContext, at: Point): Castle {
  const others = ctx.nodes;
  const front = CASTLE_FRONT.filter((f) => clearOfRoute({ x: at.x + f.x, y: at.y + f.y, r: f.r }, ctx.bandSamples, others, 2, 10));
  const back = CASTLE_BACK.filter((f) => clearOfRoute({ x: at.x + f.x, y: at.y + f.y, r: f.r }, ctx.bandSamples, others, 2, 10));
  return { at, front, back, footprints: shift([...CASTLE_BODY, ...back, ...front], at) };
}

/** Lieu au bord de l'écran, du côté qui convient le mieux ; null s'il n'y a pas de place. */
function edgeSpot(
  shapeFor: (side: number) => Footprint[],
  sides: number[],
  inset: [number, number],
  y0: number,
  y1: number,
  width: number,
  base: { samples: readonly Point[]; nodes: readonly Point[]; taken: readonly Footprint[] },
): (Point & { side: number }) | null {
  for (const side of sides) {
    const x0 = side < 0 ? inset[0] : width - inset[1];
    const x1 = side < 0 ? inset[1] : width - inset[0];
    const spot = findSpot({
      shape: shapeFor(side),
      prefer: { x: (x0 + x1) / 2 + side * (x1 - x0) * 0.25, y: (y0 + y1) / 2 },
      within: { x0, x1, y0, y1 },
      ...base,
    });
    if (spot) return { ...spot, side };
  }
  return null;
}

export function prepareClouds(ctx: SceneContext): CloudsPrep {
  const { band, width, bandSamples } = ctx;
  const id = `clouds-${band.worldIndex}-`;
  const h = band.bottom - band.top;
  const yAt = (t: number) => band.bottom - t * h;
  const tAt = (y: number) => altitude(band, y);
  // Le panneau d'entrée compte comme un niveau : on le garde dégagé.
  const obstacles = [...ctx.nodes, ctx.sign];
  const taken: Footprint[] = [];
  const footprints: Footprint[] = [];
  const base = () => ({ samples: bandSamples, nodes: obstacles, taken });
  const keep = (shape: Footprint[], extra: Footprint[] = []) => {
    footprints.push(...shape);
    taken.push(...shape, ...extra);
  };
  // Rien de grand dans la mer de nuages d'arrivée ni contre le bord du haut.
  const low = band.bottom - 70;

  const castle = ctx.end ? castleAt(ctx, ctx.end) : null;
  if (castle) keep(castle.footprints, [{ x: castle.at.x, y: castle.at.y - 120, r: 120 }]);

  const rainbow = findRainbow(ctx, obstacles, Math.min(low - 20, yAt(0.07)), yAt(0.3), taken);
  if (rainbow) {
    keep(rainbowFeet(rainbow).flatMap(cloudDisks), arcDisks(rainbow));
  }

  // Le soleil se couche du côté où le chemin laisse le plus de place.
  const pathX = (y: number) =>
    bandSamples.reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best), bandSamples[0] ?? { x: width / 2, y }).x;
  const sunY = yAt(0.47);
  const sunSides = pathX(sunY) > width / 2 ? [-1, 1] : [1, -1];
  const sunSpot = edgeSpot(sunShape, sunSides, [24, 84], yAt(0.55), yAt(0.4), width, base());
  if (sunSpot) keep(shift(sunShape(sunSpot.side), sunSpot));
  const sun = sunSpot;

  // La lune, du côté opposé au château, haut dans la nuit.
  const moonSides = castle && castle.at.x > width / 2 ? [-1, 1] : [1, -1];
  const moonSpot = edgeSpot(() => MOON_SHAPE, moonSides, [26, 96], Math.max(band.top + 60, yAt(0.97)), yAt(0.8), width, base());
  if (moonSpot) keep(shift(MOON_SHAPE, moonSpot), [{ ...moonSpot, r: MOON_R + 40 }]);
  const moon = moonSpot ? { x: moonSpot.x, y: moonSpot.y } : null;

  const place = (shape: Footprint[], y0: number, y1: number, prefer: Point, x0 = 30, x1 = width - 30) => {
    const spot = findSpot({ shape, prefer, within: { x0, x1, y0: Math.min(y0, y1), y1: Math.max(y0, y1) }, ...base() });
    if (spot) keep(shift(shape, spot));
    return spot;
  };
  // Monde très court (un ou deux niveaux) : pas de montgolfière ni de fusée, pour ne pas l'encombrer.
  const roomy = h >= 1000;
  const balloonY = yAt(0.24);
  const balloon = !roomy ? null : place(BALLOON_SHAPE, yAt(0.12), yAt(0.4), { x: pathX(balloonY) > width / 2 ? width * 0.18 : width * 0.82, y: balloonY }, 34, width - 34);
  const rocketY = yAt(0.72);
  const rocket = !roomy ? null : place(ROCKET_SHAPE, yAt(0.66), yAt(0.84), { x: pathX(rocketY) > width / 2 ? width * 0.2 : width * 0.78, y: rocketY }, 40, width - 40);
  // L'étoile filante, loin de la lune.
  const shootY = yAt(0.8);
  const shootX = moon ? (moon.x < width / 2 ? width * 0.62 : width * 0.12) : width * 0.3;
  const shooting = place(SHOOTING_SHAPE, yAt(0.7), Math.max(band.top + 40, yAt(0.95)), { x: shootX, y: shootY }, 10, width - 90);

  // Grands bancs de nuages, en alternance contre les bords.
  const banks: Cloud[] = [];
  let k = 0;
  for (let y = band.bottom - 230; y > band.top + 120; y -= 330, k += 1) {
    const s = BANK_SCALE * (0.9 + hash01(band.worldIndex * 71 + k) * 0.25);
    const shape = cloudDisks({ x: 0, y: 0, s, flip: false, shape: 1 });
    const side = k % 2 === 0 ? -1 : 1;
    const spot = edgeSpot(() => shape, [side, -side], [0, 56], y - 110, y + 60, width, base());
    if (!spot) continue;
    keep(shift(shape, spot));
    banks.push({ x: spot.x, y: spot.y, s, flip: spot.side > 0, shape: 1 });
  }

  // Petit décor : nuages partout ; oiseaux de jour, étincelles de nuit.
  const kindsAt = (_x: number, y: number) => {
    const t = tAt(y);
    return t < DAY_END ? KINDS_DAY : t < NIGHT_FROM ? KINDS_DUSK : KINDS_NIGHT;
  };
  const decor = placeDecor(band, width, [...bandSamples], obstacles, kindsAt, taken);
  const clouds: Cloud[] = decor
    .filter((d) => d.kind === 'cloud')
    .map((d, i) => ({ x: d.x, y: d.y + 8, s: d.scale * 0.95, flip: d.flip, shape: (hash01(i * 13 + 7) < 0.3 ? 1 : 0) as 0 | 1 }));
  // Les oiseaux volent par deux ou trois.
  const birds = decor
    .filter((d) => d.kind === 'bird' && tAt(d.y) < DAY_END - 0.03)
    .flatMap((d, i) => {
      const m = d.flip ? -1 : 1;
      const flock = [d, { ...d, x: d.x + 15 * m, y: d.y - 9, scale: d.scale * 0.75 }];
      if (hash01(i * 7 + 3) < 0.4) flock.push({ ...d, x: d.x + 4 * m, y: d.y - 20, scale: d.scale * 0.6 });
      return flock;
    });
  const sparks = decor.filter((d) => d.kind === 'spark');

  // Étoiles : de plus en plus nombreuses et vives en montant dans la nuit.
  const stars: CloudsPrep['stars'] = [[], [], []];
  const cell = 40;
  const clearDot = (x: number, y: number) =>
    obstacles.every((n) => Math.hypot(n.x - x, n.y - y) > NODE_SIZE / 2 + 8) &&
    bandSamples.every((p) => Math.hypot(p.x - x, p.y - y) > PATH_WIDTH / 2 + 6) &&
    footprints.every((f) => Math.hypot(f.x - x, f.y - y) > f.r);
  for (let y = band.top + 10, row = 0; y < yAt(NIGHT_FROM - 0.06); y += cell, row += 1) {
    const t = tAt(y);
    const dark = Math.min(1, Math.max(0, (t - (NIGHT_FROM - 0.06)) / 0.16));
    for (let x = 8, col = 0; x < width; x += cell, col += 1) {
      const seed = band.worldIndex * 7001 + row * 131 + col * 17;
      if (hash01(seed) > 0.25 + dark * 0.45) continue;
      const sx = x + (hash01(seed + 1) - 0.5) * cell * 0.9;
      const sy = y + (hash01(seed + 2) - 0.5) * cell * 0.9;
      if (sy < band.top + 4 || !clearDot(sx, sy)) continue;
      const bright = Math.min(2, Math.floor(dark * 2.2 + hash01(seed + 3) * 0.9));
      stars[bright]!.push({ x: sx, y: sy, r: 1 + hash01(seed + 4) * 1.1 });
    }
  }

  return { id, rainbow, sun, moon, balloon, rocket, shooting, castle, banks, clouds, birds, sparks, stars, footprints };
}
