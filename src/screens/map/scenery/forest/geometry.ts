// Géométrie de la forêt : où se posent la mare, le ruisseau, l'arbre-maison, les sapins et le petit décor.
// Tout est pur et déterministe (voir forest.test.ts) ; les dessins sont dans art.tsx.
import {
  NODE_SIZE,
  PATH_WIDTH,
  altitude,
  clearOfRoute,
  findSpot,
  hash01,
  placeDecor,
  samplePath,
  smoothPathD,
  type DecorKind,
  type Footprint,
  type Point,
} from '../../layout';
import type { SceneContext } from '../types';

/** Altitudes (0 au pied, 1 en haut) où la lisière devient clairière, puis sous-bois. */
export const GLADE_FROM = 0.3;
export const WOOD_FROM = 0.65;
/** Où les sapins commencent à se serrer (avant le sous-bois : la lisière du bois). */
const PINES_FROM = 0.58;
/** Distance minimale entre la plage (qui mord de 26 px dans la bande) et le haut d'un grand dessin. */
const BEACH_ROOM = 48;

export interface Item {
  /** Clé du dessin (voir ForestDefs). */
  k: string;
  x: number;
  y: number;
  s: number;
  flip: boolean;
}

export interface Pond {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface Creek {
  /** Axe du ruisseau, de la mare au bord de l'écran. */
  d: string;
  points: Point[];
  /** Croisement avec le chemin, et rotation du pont (degrés) pour qu'il suive le chemin. */
  crossing: Point;
  angle: number;
  pond: Pond;
  /** Côté de la mare par rapport au chemin : 1 à droite, -1 à gauche. */
  side: 1 | -1;
}

export interface House {
  x: number;
  y: number;
  scale: number;
}

export interface Ray {
  d: string;
}

export interface ForestPlan {
  creek: Creek | null;
  house: House | null;
  items: Item[];
  rays: Ray[];
  glows: Point[];
  fence: Array<[number, number]>;
  footprints: Footprint[];
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Obstacles à éviter : le chemin, les niveaux, et les emprises déjà prises. */
function makeEnv(ctx: SceneContext, taken: Footprint[]) {
  const path = ctx.bandSamples;
  const nodes = ctx.nodes.filter((n) => n.y > ctx.band.top - 120 && n.y < ctx.band.bottom + 120);
  /** Disque libre : à `pm` du bord du chemin, à `nm` du bord d'un niveau, hors des emprises. */
  const free = (x: number, y: number, r: number, pm = 8, nm = 10): boolean => {
    const pmin = PATH_WIDTH / 2 + pm + r;
    const nmin = NODE_SIZE / 2 + nm + r;
    return (
      path.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= pmin * pmin) &&
      nodes.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= nmin * nmin) &&
      taken.every((f) => (f.x - x) ** 2 + (f.y - y) ** 2 >= (f.r + r) ** 2)
    );
  };
  /** Silhouette haute (sapin, arbre) : pied, milieu et cime ne doivent pas masquer le chemin. */
  const freeTall = (x: number, y: number, r: number, h: number, pm = 8, nm = 10): boolean =>
    free(x, y, r, pm, nm) && free(x, y - h * 0.5, r * 0.9, pm, nm) && free(x, y - h, r * 0.5, pm, nm);
  return { free, freeTall };
}

/**
 * Ruisseau : part de la mare, traverse le chemin (sous un petit pont) là où il est assez droit,
 * entre deux niveaux de la clairière, puis file vers le bord de l'écran de l'autre côté.
 */
export function planCreek(ctx: SceneContext): Creek | null {
  const { band, width, samples, nodes } = ctx;
  const tAt = (y: number) => altitude(band, y);
  const candidates: Array<{ c: Point; t: Point; bend: number; y: number }> = [];
  for (let k = 0; k + 1 < nodes.length; k += 1) {
    const a = nodes[k] as Point;
    const b = nodes[k + 1] as Point;
    const mid = tAt((a.y + b.y) / 2);
    if (mid < GLADE_FROM + 0.02 || mid > WOOD_FROM - 0.02) continue;
    for (const f of [0.5, 0.42, 0.58, 0.35, 0.65]) {
      const ty = a.y + (b.y - a.y) * f;
      let best = -1;
      for (let i = 0; i < samples.length; i += 1) {
        const p = samples[i] as Point;
        if (p.y > a.y || p.y < b.y) continue;
        if (best < 0 || Math.abs(p.y - ty) < Math.abs((samples[best] as Point).y - ty)) best = i;
      }
      if (best < 8 || best > samples.length - 9) continue;
      const before = samples[best - 8] as Point;
      const here = samples[best] as Point;
      const after = samples[best + 8] as Point;
      const a1 = Math.atan2(here.y - before.y, here.x - before.x);
      const a2 = Math.atan2(after.y - here.y, after.x - here.x);
      let bend = Math.abs(a1 - a2);
      if (bend > Math.PI) bend = 2 * Math.PI - bend;
      const s0 = samples[best - 3] as Point;
      const s1 = samples[best + 3] as Point;
      const len = dist(s0, s1) || 1;
      const t = { x: (s1.x - s0.x) / len, y: (s1.y - s0.y) / len };
      // Un chemin presque horizontal ferait un ruisseau qui court le long de la bande : on l'écarte.
      if (Math.abs(t.y) < 0.55) continue;
      candidates.push({ c: here, t, bend: bend + Math.abs(f - 0.5) * 0.05, y: here.y });
    }
  }
  candidates.sort((u, v) => u.bend - v.bend || u.y - v.y);
  const near = (y: number) => samples.filter((p) => Math.abs(p.y - y) < 520);

  for (const { c, t } of candidates) {
    const n0 = { x: -t.y, y: t.x };
    const nearPath = near(c.y);
    // Mare du côté où il y a le plus de place.
    const sides: Array<1 | -1> = c.x < width / 2 ? [1, -1] : [-1, 1];
    for (const side of sides) {
      const n = n0.x * side > 0 ? n0 : { x: -n0.x, y: -n0.y };
      for (const d of [124, 140, 108]) {
        for (const shift of [0, -44, 44]) {
          const pond: Pond = { x: c.x + n.x * d + t.x * shift, y: c.y + n.y * d + t.y * shift, rx: 62, ry: 38 };
          if (pond.x < 46 || pond.x > width - 46) continue;
          const disks = pondDisks(pond);
          if (!disks.every((f) => clearOfRoute(f, nearPath, nodes, 10, 10))) continue;
          // Axe : mare → croisement (perpendiculaire au chemin) → bord de l'écran, avec deux ondulations.
          const edge = side > 0 ? -14 : width + 14;
          const k = (c.x - edge) / n.x;
          if (k < 40 || k > 420) continue;
          const pts: Point[] = [
            { x: pond.x, y: pond.y },
            { x: c.x + n.x * 62 - t.x * 14, y: c.y + n.y * 62 - t.y * 14 },
            { x: c.x, y: c.y },
            { x: c.x - n.x * k * 0.4 + t.x * 18, y: c.y - n.y * k * 0.4 + t.y * 18 },
            { x: c.x - n.x * k * 0.75 - t.x * 14, y: c.y - n.y * k * 0.75 - t.y * 14 },
            { x: c.x - n.x * k, y: c.y - n.y * k },
          ];
          const line = samplePath(pts);
          const ok = line.every((p) => {
            if (nodes.some((q) => dist(p, q) < NODE_SIZE / 2 + 40)) return false;
            if (dist(p, c) > 50 && nearPath.some((q) => dist(p, q) < PATH_WIDTH / 2 + 30)) return false;
            return p.y > band.top + 80 && p.y < band.bottom - 80;
          });
          if (!ok) continue;
          return {
            d: smoothPathD(pts),
            points: line,
            crossing: c,
            angle: (Math.atan2(-t.x, t.y) * 180) / Math.PI,
            pond,
            side,
          };
        }
      }
    }
  }
  return null;
}

/** Emprise de la mare : trois disques côte à côte. */
export function pondDisks(p: Pond): Footprint[] {
  return [-30, 0, 30].map((dx) => ({ x: p.x + dx, y: p.y, r: 34 }));
}

/** Emprise de l'arbre-maison à l'échelle `s`, relative au pied du tronc. */
export function houseShape(s: number): Footprint[] {
  return [
    { x: 0, y: -10 * s, r: 50 * s },
    { x: 0, y: -85 * s, r: 40 * s },
    { x: -44 * s, y: -130 * s, r: 46 * s },
    { x: 44 * s, y: -130 * s, r: 46 * s },
    { x: 0, y: -165 * s, r: 58 * s },
    { x: 60 * s, y: -105 * s, r: 26 * s },
  ];
}

const LISIERE_KINDS: readonly DecorKind[] = [
  { kind: 'fl-pink', radius: 8, weight: 3 },
  { kind: 'fl-yellow', radius: 8, weight: 3 },
  { kind: 'fl-white', radius: 8, weight: 2 },
  { kind: 'fl-violet', radius: 8, weight: 1 },
  { kind: 'grass', radius: 8, weight: 2 },
  { kind: 'bush', radius: 18, weight: 1.5 },
  { kind: 'tree', radius: 30, weight: 0.8, tall: 48 },
  { kind: '', radius: 0, weight: 3 },
];
const GLADE_KINDS: readonly DecorKind[] = [
  { kind: 'fl-white', radius: 8, weight: 2 },
  { kind: 'fl-violet', radius: 8, weight: 2 },
  { kind: 'fl-yellow', radius: 8, weight: 1 },
  { kind: 'grass', radius: 8, weight: 3 },
  { kind: 'bush', radius: 18, weight: 2 },
  { kind: 'tree', radius: 30, weight: 1.6, tall: 48 },
  { kind: '', radius: 0, weight: 3 },
];
const WOOD_KINDS: readonly DecorKind[] = [
  { kind: 'mush', radius: 10, weight: 2 },
  { kind: 'grass', radius: 8, weight: 2 },
  { kind: 'pine', radius: 20, weight: 0.8, tall: 56 },
  { kind: '', radius: 0, weight: 5 },
];

export function planForest(ctx: SceneContext): ForestPlan {
  const { band, width } = ctx;
  const height = band.bottom - band.top;
  const tAt = (y: number) => altitude(band, y);
  const topLimit = ctx.passageOut ? band.top + BEACH_ROOM : band.top + 10;
  const items: Item[] = [];
  const taken: Footprint[] = [];
  // Panneau d'entrée et bout du chemin : toujours dégagés.
  taken.push({ x: ctx.sign.x, y: ctx.sign.y - 22, r: 40 });
  if (ctx.end) taken.push({ x: ctx.end.x, y: ctx.end.y - 20, r: 50 });

  // 1. Grands lieux : la mare et son ruisseau (clairière), l'arbre-maison (sous-bois).
  const creek = planCreek(ctx);
  const footprints: Footprint[] = [];
  if (creek) {
    const disks = pondDisks(creek.pond);
    footprints.push(...disks);
    taken.push(...disks);
    // Le ruisseau lui-même : des disques le long de l'axe, sauf sous le pont (le chemin le traverse).
    for (let i = 0; i < creek.points.length; i += 2) {
      const p = creek.points[i] as Point;
      if (dist(p, creek.crossing) > 44) taken.push({ x: p.x, y: p.y, r: 24 });
    }
    const { pond, side } = creek;
    // Sur l'eau : canard, nénuphars ; sur la rive opposée au chemin : roseaux.
    items.push({ k: 'lily', x: pond.x - 30 * side, y: pond.y + 12, s: 1, flip: false });
    items.push({ k: 'lily', x: pond.x + 6 * side, y: pond.y + 22, s: 0.8, flip: false });
    items.push({ k: 'duck', x: pond.x - 6 * side, y: pond.y + 2, s: 1.15, flip: side < 0 });
    const reedX = Math.min(width - 12, Math.max(12, pond.x + (pond.rx - 8) * side));
    items.push({ k: 'reeds', x: reedX, y: pond.y - 8, s: 1, flip: false });
    items.push({ k: 'reeds', x: Math.min(width - 10, Math.max(10, reedX - 10 * side)), y: pond.y + 14, s: 0.8, flip: true });
  }

  let house: House | null = null;
  const woodTop = band.top + (ctx.passageOut ? 150 : 40);
  const woodBottom = band.bottom - height * (WOOD_FROM + 0.05);
  for (const scale of [1.05, 0.95, 0.85, 0.75, 0.65]) {
    const spot = findSpot({
      shape: houseShape(scale),
      prefer: { x: width * 0.2, y: (woodTop + woodBottom) / 2 + 160 },
      // Le tronc reste à l'écran : seul le bord de la couronne peut dépasser un peu.
      within: { x0: 70 * scale, x1: width - 70 * scale, y0: woodTop + 240 * scale, y1: woodBottom },
      samples: ctx.samples,
      nodes: ctx.nodes,
      taken,
      pathMargin: 10,
      nodeMargin: 8,
    });
    if (spot) {
      house = { x: spot.x, y: spot.y, scale };
      break;
    }
  }
  if (house) {
    const disks = houseShape(house.scale).map((f) => ({ x: house!.x + f.x, y: house!.y + f.y, r: f.r }));
    footprints.push(...disks);
    taken.push(...disks);
    items.push({ k: 'house', x: house.x, y: house.y, s: house.scale, flip: false });
    const s = house.scale;
    items.push({ k: 'mush', x: house.x + 55 * s, y: house.y + 8 * s, s: 1.2, flip: false });
    items.push({ k: 'mush', x: house.x + 71 * s, y: house.y - 4 * s, s: 0.9, flip: false });
    items.push({ k: 'mush', x: house.x - 59 * s, y: house.y + 14 * s, s: 1.1, flip: false });
  }

  // 2. Le lapin de la lisière.
  const rabbit = findSpot({
    shape: [{ x: 0, y: -10, r: 18 }],
    prefer: { x: ctx.nodes[0] && ctx.nodes[0].x < width / 2 ? width * 0.82 : width * 0.18, y: band.bottom - 150 },
    within: { x0: 30, x1: width - 30, y0: band.bottom - 260, y1: band.bottom - 110 },
    samples: ctx.samples,
    nodes: ctx.nodes,
    taken,
    pathMargin: 14,
    nodeMargin: 12,
  });
  if (rabbit) {
    items.push({ k: 'rabbit', x: rabbit.x, y: rabbit.y, s: 1.05, flip: rabbit.x > width / 2 });
    taken.push({ x: rabbit.x, y: rabbit.y - 10, r: 22 });
  }

  const env = makeEnv(ctx, taken);

  // 3. Bosquets d'arbres ronds autour de la clairière.
  const bosquets: Footprint[] = [];
  const gladeHi = band.bottom - height * (GLADE_FROM - 0.02);
  const gladeLo = band.bottom - height * (WOOD_FROM - 0.02);
  for (let n = 0; n < 60 && bosquets.length < 10; n += 1) {
    const left = hash01(n * 7 + 3) < 0.5;
    const cx = left ? -10 + hash01(n * 7 + 1) * width * 0.3 : width * 0.7 + hash01(n * 7 + 1) * (width * 0.3 + 10);
    const cy = gladeLo + hash01(n * 7 + 2) * (gladeHi - gladeLo);
    if (bosquets.some((b) => dist(b, { x: cx, y: cy }) < 90)) continue;
    const offsets = [
      [0, 0, 1.1],
      [34, 14, 0.95],
      [-34, 12, 1.0],
      [10, -26, 0.9],
    ] as const;
    const mine: Item[] = [];
    for (const [ox, oy, sc] of offsets) {
      const x = cx + ox;
      const y = cy + oy;
      if (mine.some((m) => dist(m, { x, y }) < 28)) continue;
      if (!env.freeTall(x, y, 22 * sc, 46 * sc)) continue;
      mine.push({ k: 'tree', x, y, s: sc, flip: hash01(n * 11 + ox) < 0.5 });
    }
    if (mine.length < 2) continue;
    bosquets.push({ x: cx, y: cy, r: 40 });
    for (const m of mine) {
      items.push(m);
      taken.push({ x: m.x, y: m.y - 10, r: 26 * m.s });
    }
    items.push({ k: 'bush', x: cx + 4, y: cy + 36, s: 1, flip: false });
  }

  // 4. Sapins serrés sur les bords du sous-bois : le chemin passe dans un couloir.
  const pineTop = topLimit + 58 * 0.6;
  const pineBottom = band.bottom - height * PINES_FROM;
  for (let iy = 0, y = pineTop; y <= pineBottom + 40; iy += 1, y += 28) {
    for (let ix = 0, x = -14; x <= width + 14; ix += 1, x += 32) {
      const h = iy * 131 + ix * 17;
      const px = x + (hash01(h + 1) - 0.5) * 20;
      const py = y + (hash01(h + 2) - 0.5) * 14;
      const ramp = clamp01((tAt(py) - PINES_FROM) / 0.1);
      // Près du chemin, les sapins s'espacent (le couloir respire) ; loin, ils se serrent.
      const d = Math.min(...ctx.bandSamples.map((q) => dist(q, { x: px, y: py })));
      if (hash01(h + 3) > ramp * (d > 95 ? 0.75 : d > 62 ? 0.42 : 0.28)) continue;
      // Plus on approche de la plage, plus les sapins sont petits : rien ne déborde sur elle.
      const grow = Math.min(1, Math.max(0.55, (py - topLimit) / 58));
      const s = Math.min(1.25, (0.95 + hash01(h + 4) * 0.3) * (ctx.passageOut ? grow : 1));
      if (ctx.passageOut && py - 58 * s < topLimit) continue;
      if (!env.freeTall(px, py, 13 * s, 52 * s, 9, 12)) continue;
      items.push({ k: 'pine', x: px, y: py, s, flip: hash01(h + 5) < 0.5 });
    }
  }
  const pines = items.filter((i) => i.k === 'pine').map((i) => ({ x: i.x, y: i.y, r: 14 * i.s }));

  // 5. Petit décor selon l'étape (fleurs de la lisière, bosquets de la clairière, champignons du sous-bois).
  const kindsAt = (x: number, y: number): readonly DecorKind[] => {
    const t = tAt(y) + (hash01(Math.round(x) * 7 + Math.round(y)) - 0.5) * 0.08;
    return t < GLADE_FROM ? LISIERE_KINDS : t < WOOD_FROM ? GLADE_KINDS : WOOD_KINDS;
  };
  const decor = placeDecor(band, width, [...ctx.bandSamples], [...ctx.nodes], kindsAt, [...taken, ...pines]);
  for (const d of decor) items.push({ k: d.kind, x: d.x, y: d.y, s: d.scale, flip: d.flip });

  // 6. Papillons de la lisière, lucioles du sous-bois : dans l'air, près du chemin.
  const glows: Point[] = [];
  const butterflies: Item[] = [];
  const wood = { lo: band.top + (ctx.passageOut ? 90 : 30), hi: band.bottom - height * (WOOD_FROM + 0.02) };
  const meadow = { lo: band.bottom - height * (GLADE_FROM - 0.02), hi: band.bottom - 90 };
  for (let n = 0; n < 160 && (glows.length < 16 || butterflies.length < 5); n += 1) {
    const x = 20 + hash01(n * 5 + 1) * (width - 40);
    if (glows.length < 16 && hash01(n * 5 + 4) < 0.5) {
      const y = wood.lo + hash01(n * 5 + 2) * (wood.hi - wood.lo);
      const d = Math.min(...ctx.bandSamples.map((p) => dist(p, { x, y })));
      if (d > 36 && d < 120 && ctx.nodes.every((p) => dist(p, { x, y }) > NODE_SIZE / 2 + 16)) glows.push({ x, y });
    } else if (butterflies.length < 5) {
      const y = meadow.lo + hash01(n * 5 + 3) * (meadow.hi - meadow.lo);
      const d = Math.min(...ctx.bandSamples.map((p) => dist(p, { x, y })));
      if (d > 30 && ctx.nodes.every((p) => dist(p, { x, y }) > NODE_SIZE / 2 + 14)) {
        butterflies.push({ k: butterflies.length % 2 ? 'bfly-violet' : 'bfly-orange', x, y, s: 0.9 + hash01(n) * 0.3, flip: n % 2 === 0 });
      }
    }
  }

  // Du fond vers l'avant ; les papillons passent par-dessus tout.
  items.sort((a, b) => a.y - b.y);
  items.push(...butterflies);

  // 7. Rayons de lumière dans le sous-bois.
  const rays: Ray[] = [];
  for (let n = 0; n < 5; n += 1) {
    const x = width * (0.1 + 0.2 * n) + (hash01(n + 40) - 0.5) * 30;
    const y0 = wood.lo + 20 + hash01(n + 50) * (wood.hi - wood.lo - 360);
    const w = 28 + hash01(n + 60) * 26;
    const len = 240 + hash01(n + 70) * 120;
    rays.push({ d: `M ${r1(x)} ${r1(y0)} L ${r1(x + w)} ${r1(y0)} L ${r1(x + w - 46)} ${r1(y0 + len)} L ${r1(x - 46 - w * 0.6)} ${r1(y0 + len)} Z` });
  }

  // 8. Barrière du départ, de part et d'autre du chemin (le panneau garde son côté dégagé).
  const first = ctx.nodes[0];
  const fence: Array<[number, number]> = [];
  if (first && band.worldIndex === 0) {
    const gap = 34;
    if (first.x - gap - 10 > 40) fence.push([10, first.x - gap]);
    if (width - 10 - (first.x + gap) > 40) fence.push([first.x + gap, width - 10]);
  }

  return { creek, house, items, rays, glows, fence, footprints };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
