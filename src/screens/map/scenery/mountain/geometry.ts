// Montagne : géométrie pure (étages, torrent, lieux, décor). Aucun DOM : testable sans navigateur.
// Les étages se lisent à l'altitude sur la montagne (`shape.climb`) : 0 au pied, 1 à la pointe.
import {
  NODE_SIZE,
  PATH_WIDTH,
  altitude,
  clearOfRoute,
  findSpot,
  hash01,
  onMountain,
  overlaps,
  placeDecor,
  samplePath,
  smoothPathD,
  type Decor,
  type DecorKind,
  type Footprint,
  type MountainShape,
  type Point,
} from '../../layout';
import type { SceneContext } from '../types';

/** Haut de chaque étage (altitude) : l'alpage finit à 0,3, la forêt à 0,55, le pierrier à 0,8 ; au-dessus, la neige. */
export const STAGE_TOPS = [0.3, 0.55, 0.8] as const;
export type Stage = 'meadow' | 'forest' | 'scree' | 'snow';

/** Demi-largeur du ruisseau sous le pont, et du torrent plus haut. */
export const BROOK_HALF = 8;
export const STREAM_HALF = 4;

export interface Placed {
  kind: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
}

export interface Torrent {
  /** Du névé où il naît jusqu'au haut de la cascade (peut être vide : la source sort du rocher). */
  stream: Point[];
  /** Bas de la cascade : centre de la vasque. */
  pool: Point;
  /** De la vasque au bord de la carte, en passant sous le pont. */
  brook: Point[];
  brookD: string;
  /** Point où le ruisseau passe sous le chemin, et sens du chemin là (degrés). */
  bridge: Point & { angle: number };
  side: 1 | -1;
}

export interface MountainPlan {
  /** Lisières entre étages (alpage|forêt, forêt|pierrier, pierrier|neige), de gauche à droite. */
  edges: [Point[], Point[], Point[]];
  torrent: Torrent | null;
  /** Grands et petits lieux (chalet, vaches, cascade, bouquetin, refuge…), points d'appui au sol. */
  places: Placed[];
  /** Emprises des lieux (test des emprises, évitement du décor). */
  footprints: Footprint[];
  /** Sapins de la forêt, puis petit décor semé ; triés avec les lieux au dessin. */
  decor: Placed[];
}

/** Ordonnée d'une altitude sur la montagne. */
export function yAt(shape: MountainShape, t: number): number {
  const { climb } = shape;
  return climb.bottom - t * (climb.bottom - climb.top);
}

/** Lisières organiques : vagues douces en bas, festons de la limite des arbres, pointes de neige en haut. */
function buildEdges(shape: MountainShape, width: number, seed: number): [Point[], Point[], Point[]] {
  const H = shape.climb.bottom - shape.climb.top;
  const amp = Math.min(1, H / 2400); // un monde incomplet (montagne courte) a des lisières plus sages
  const wave = (k: number, step: number, f: (x: number, i: number) => number): Point[] => {
    const out: Point[] = [];
    const base = yAt(shape, STAGE_TOPS[k] as number);
    for (let x = -24, i = 0; x <= width + 24 + step; x += step, i += 1) out.push({ x, y: base + f(x, i) * amp });
    return out;
  };
  const ph = hash01(seed) * 6;
  return [
    wave(0, 20, (x) => 22 * Math.sin(x / 61 + ph) + 9 * Math.sin(x / 23 + ph * 2)),
    wave(1, 18, (x, i) => 16 * Math.sin(x / 47 + ph * 3) + (i % 2 === 0 ? 7 : -5) + 6 * hash01(seed + 40 + i)),
    // Pointes de neige : la neige descend en langues pointues, plus ou moins longues.
    wave(2, 13, (x, i) => {
      const h = hash01(seed + 90 + i);
      const tongue = i % 2 === 1 && hash01(seed + 120 + i) < 0.7;
      return 9 * Math.sin(x / 71 + ph) + (tongue ? 8 + 34 * h * h : -7 + 5 * h);
    }),
  ];
}

function edgeY(edge: readonly Point[], x: number): number {
  const first = edge[0] as Point;
  const step = (edge[1] as Point).x - first.x;
  const i = Math.max(0, Math.min(edge.length - 2, Math.floor((x - first.x) / step)));
  const a = edge[i] as Point;
  const b = edge[i + 1] as Point;
  const f = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x)));
  return a.y + (b.y - a.y) * f;
}

export function stageAt(edges: MountainPlan['edges'], x: number, y: number): Stage {
  if (y > edgeY(edges[0], x)) return 'meadow';
  if (y > edgeY(edges[1], x)) return 'forest';
  if (y > edgeY(edges[2], x)) return 'scree';
  return 'snow';
}

/** Le ciel de chaque côté de la montagne, en disques : un lieu qui les touche déborderait dans le vide. */
function skyDisks(shape: MountainShape, width: number): Footprint[] {
  const out: Footprint[] = [];
  const R = 70;
  for (let i = 0; i < shape.rows.length; i += 2) {
    const row = shape.rows[i] as { y: number; left: number; right: number };
    if (row.left > -R) out.push({ x: row.left - R + 8, y: row.y, r: R });
    if (row.right < width + R) out.push({ x: row.right + R - 8, y: row.y, r: R });
  }
  return out;
}

/** Disques le long d'une polyligne (pour tenir le décor à l'écart de l'eau). */
function disksAlong(points: readonly Point[], r: number, step: number): Footprint[] {
  const out: Footprint[] = [];
  let last: Point | null = null;
  for (const p of points) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < step) continue;
    out.push({ x: p.x, y: p.y, r });
    last = p;
  }
  return out;
}

function nearestDist(points: readonly Point[], p: Point): number {
  let best = Infinity;
  for (const q of points) best = Math.min(best, (q.x - p.x) ** 2 + (q.y - p.y) ** 2);
  return Math.sqrt(best);
}

/** Emprise de la cascade (rocher, chute, vasque), relative au centre de la vasque. */
const CASCADE_SHAPE: readonly Footprint[] = [
  { x: 0, y: 2, r: 36 },
  { x: -18, y: -40, r: 27 },
  { x: 18, y: -40, r: 27 },
  { x: 0, y: -70, r: 18 },
];

/**
 * Torrent : il naît d'un névé du pierrier, descend le long d'un bord, tombe en cascade dans une vasque
 * à la limite des arbres, puis le ruisseau file vers l'autre bord en passant une seule fois sous le
 * chemin, sous un pont de pierre. Null s'il n'y a pas la place (montagne trop courte).
 */
function buildTorrent(ctx: SceneContext, shape: MountainShape, taken: Footprint[]): Torrent | null {
  const { width, nodes } = ctx;
  const samples = ctx.bandSamples;
  const yPool = yAt(shape, 0.5);
  const midPath = samples.filter((p) => Math.abs(p.y - yPool) < 300);
  const meanX = midPath.reduce((s, p) => s + p.x, 0) / Math.max(1, midPath.length);
  const sides: Array<1 | -1> = meanX < width / 2 ? [1, -1] : [-1, 1];
  for (const side of sides) {
    const edgeX = side > 0 ? width - 40 : 40;
    const pool = findSpot({
      shape: CASCADE_SHAPE,
      prefer: { x: edgeX, y: yPool },
      within: {
        x0: side > 0 ? width * 0.55 : 34,
        x1: side > 0 ? width - 34 : width * 0.45,
        y0: yAt(shape, 0.54),
        y1: yAt(shape, 0.44),
      },
      samples,
      nodes,
      taken,
      pathMargin: 12,
      nodeMargin: 18,
    });
    if (!pool) continue;
    // Torrent : du haut de la cascade, il remonte tant qu'il reste loin du chemin, jusqu'au névé.
    const stream: Point[] = [];
    const fallTop = pool.y - 84;
    const snowY = yAt(shape, 0.8);
    for (let y = fallTop, k = 0; y > snowY; y -= 12, k += 1) {
      const x = pool.x + (Math.sin(k / 2.4 + 1) - Math.sin(1)) * 12 * side;
      const ok =
        clearOfRoute({ x, y, r: STREAM_HALF + 6 }, samples, nodes, 10, 14) &&
        onMountain(shape, x - 16, y) &&
        onMountain(shape, x + 16, y) &&
        x > 10 &&
        x < width - 10;
      if (!ok) break;
      stream.push({ x, y });
    }
    stream.reverse();
    // Ruisseau : passe sous le chemin à un endroit loin des niveaux, plus bas que la vasque.
    const candidates = samples
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.y > pool.y + 70 && p.y < pool.y + 520 && altitude(shape.climb, p.y) > 0.31)
      .filter(({ p }) => nodes.every((n) => Math.hypot(n.x - p.x, n.y - p.y) > NODE_SIZE / 2 + 44))
      .sort((a, b) => Math.abs(a.p.y - (pool.y + 230)) - Math.abs(b.p.y - (pool.y + 230)) || a.i - b.i);
    for (const { p: c, i } of candidates) {
      const exit = { x: side > 0 ? -40 : width + 40, y: c.y + 70 + Math.abs(c.x - (side > 0 ? 0 : width)) * 0.25 };
      const start = { x: pool.x - side * 10, y: pool.y + 8 };
      const bend = { x: (start.x + c.x) / 2 + side * 6, y: (start.y + c.y) / 2 + 26 };
      const brook = [start, bend, c, exit];
      const pts = samplePath(brook, 16);
      const nearC = samples.filter((q) => Math.hypot(q.x - c.x, q.y - c.y) > 40);
      const clear = pts.every(
        (b) =>
          nodes.every((n) => Math.hypot(n.x - b.x, n.y - b.y) >= NODE_SIZE / 2 + BROOK_HALF + 10) &&
          (Math.hypot(b.x - c.x, b.y - c.y) < 40 || nearestDist(nearC, b) >= PATH_WIDTH / 2 + BROOK_HALF + 8),
      );
      if (!clear) continue;
      if (overlaps(disksAlong(pts.filter((b) => b.y > pool.y + 30), BROOK_HALF + 2, 10), taken)) continue;
      // Traversée franche : le ruisseau coupe le chemin presque en travers.
      const prev = samples[i - 1] ?? c;
      const next = samples[i + 1] ?? c;
      const k = pts.findIndex((b) => Math.hypot(b.x - c.x, b.y - c.y) < 0.5);
      const b0 = pts[Math.max(0, k - 1)] as Point;
      const b1 = pts[Math.min(pts.length - 1, k + 1)] as Point;
      const pa = Math.atan2(next.y - prev.y, next.x - prev.x);
      const ba = Math.atan2(b1.y - b0.y, b1.x - b0.x);
      if (Math.abs(Math.sin(pa - ba)) < 0.6) continue;
      return {
        stream,
        pool,
        brook,
        brookD: smoothPathD(brook),
        bridge: { x: c.x, y: c.y, angle: (pa * 180) / Math.PI },
        side,
      };
    }
  }
  return null;
}

/** Emprise d'un lieu à l'échelle 1, relative à son point d'appui. */
const PLACE_SHAPES: Record<string, readonly Footprint[]> = {
  chalet: [
    { x: -14, y: -24, r: 36 },
    { x: 14, y: -24, r: 36 },
    { x: 20, y: -78, r: 22 },
  ],
  cow: [{ x: 4, y: -12, r: 22 }],
  ibex: [
    { x: 0, y: -18, r: 32 },
    { x: 6, y: -60, r: 20 },
  ],
  marmot: [{ x: 4, y: -10, r: 20 }],
  cairn: [{ x: 0, y: -12, r: 14 }],
  refuge: [
    { x: -10, y: -26, r: 34 },
    { x: 12, y: -26, r: 34 },
    { x: 14, y: -72, r: 18 },
  ],
  snowman: [
    { x: 0, y: -16, r: 20 },
    { x: 0, y: -44, r: 16 },
  ],
};

/** Taille de dessin de chaque lieu (les emprises ci-dessus sont à multiplier). */
export const PLACE_SCALE: Record<string, number> = {
  chalet: 1.45,
  cow: 1.25,
  ibex: 1.25,
  marmot: 1.3,
  cairn: 1.2,
  refuge: 1.5,
  snowman: 1.35,
};

function scaled(kind: string, scale: number, flip: boolean): Footprint[] {
  return (PLACE_SHAPES[kind] ?? []).map((f) => ({ x: (flip ? -f.x : f.x) * scale, y: f.y * scale, r: f.r * scale }));
}

const TREES = new Set(['pine', 'pinelight', 'snowpine', 'tree']);

/** Rayon d'encombrement et hauteur de chaque petit dessin semé. */
const K = (kind: string, radius: number, weight: number, tall?: number): DecorKind => ({ kind, radius, weight, tall });
export const ZONE_KINDS: Record<Stage | 'sky' | 'treeline', readonly DecorKind[]> = {
  meadow: [K('flower', 8, 6), K('grass', 8, 3), K('tree', 28, 1.1, 64), K('bush', 18, 1), K('stone', 10, 0.6), K('', 20, 3)],
  forest: [K('pine', 20, 6, 52), K('fern', 10, 1.2), K('mushroom', 8, 0.5), K('', 20, 2)],
  scree: [K('crag', 16, 3, 22), K('scree', 14, 3), K('tuft', 8, 1.5), K('edelweiss', 7, 1.2), K('', 20, 2.5)],
  /** Bas du pierrier : les derniers sapins, clairsemés. */
  treeline: [K('pinelight', 18, 3, 46), K('crag', 16, 2, 22), K('scree', 14, 2), K('tuft', 8, 1.5), K('', 20, 2)],
  snow: [K('snowpine', 20, 3, 52), K('drift', 16, 2.5), K('snowcrag', 16, 1.5, 22), K('', 20, 3)],
  sky: [K('', 20, 1)],
};

/** Sapins serrés de la forêt : une masse qui borde le chemin et lui fait un couloir, percée de deux
 * clairières ; quelques sapins plus clairs et plus jeunes pour que la masse ne fasse pas tapis. */
function forestMass(ctx: SceneContext, shape: MountainShape, edges: MountainPlan['edges'], avoid: Footprint[]): Placed[] {
  const { width, nodes } = ctx;
  const samples = ctx.bandSamples;
  const out: Placed[] = [];
  const top = Math.min(...edges[1].map((p) => p.y)) - 10;
  const bottom = Math.max(...edges[0].map((p) => p.y)) + 10;
  const glades = [0.36, 0.47].map((t, k) => {
    const y = yAt(shape, t);
    const near = samples.filter((p) => Math.abs(p.y - y) < 80);
    const x = near.reduce((s, p) => s + p.x, 0) / Math.max(1, near.length);
    return { x: (x < width / 2) === (k === 0) ? width * 0.86 : width * 0.14, y, r: 46 };
  });
  let row = 0;
  for (let y = top; y <= bottom; y += 27, row += 1) {
    for (let x = row % 2 === 0 ? -4 : 13; x <= width + 6; x += 35) {
      const seed = Math.round(y) * 7 + Math.round(x) * 13;
      const px = x + (hash01(seed) - 0.5) * 14;
      const py = y + (hash01(seed + 1) - 0.5) * 12;
      if (stageAt(edges, px, py) !== 'forest' || !onMountain(shape, px, py)) continue;
      // La forêt s'éclaircit un peu à ses lisières.
      const depth = Math.min(py - edgeY(edges[1], px), edgeY(edges[0], px) - py);
      if (depth < 26 && hash01(seed + 2) < 0.5) continue;
      if (glades.some((g) => Math.hypot(g.x - px, (g.y - py) * 1.4) < g.r)) continue;
      const young = hash01(seed + 5) < 0.28;
      const scale = young ? 0.8 + hash01(seed + 3) * 0.15 : 0.95 + hash01(seed + 3) * 0.35;
      const base = { x: px, y: py, r: 13 * scale };
      const crown = [
        { x: px, y: py - 24 * scale, r: 12 * scale },
        { x: px, y: py - 44 * scale, r: 7 * scale },
      ];
      if (!clearOfRoute(base, samples, nodes, 4, 16)) continue;
      // La silhouette ne doit cacher ni le chemin, ni un niveau plus haut, ni l'eau.
      if (!clearOfRoute(crown[0]!, samples, nodes, 2, 8)) continue;
      if (!clearOfRoute(crown[1]!, samples, nodes, 2, 4)) continue;
      if (overlaps([base, ...crown], avoid)) continue;
      out.push({ kind: young ? 'pinelight' : 'pine', x: px, y: py, scale, flip: hash01(seed + 4) < 0.5 });
    }
  }
  return out;
}

/** Petites plaques de terrain (clairières, dalles, névés, éboulis) dans un étage, loin du chemin. */
export interface Patch {
  kind: 'clearing' | 'slab' | 'snowpatch' | 'pebbles' | 'canopy' | 'sastrugi';
  x: number;
  y: number;
  r: number;
  seed: number;
}

function buildPatches(ctx: SceneContext, shape: MountainShape, edges: MountainPlan['edges'], avoid: Footprint[]): Patch[] {
  const { width, nodes } = ctx;
  const samples = ctx.bandSamples;
  const out: Patch[] = [];
  const top = shape.summit.y + 60;
  const seed0 = ctx.band.worldIndex * 1000 + Math.round(width);
  let k = 0;
  for (let y = ctx.band.bottom - 70; y > top; y -= 34) {
    for (let x = 20; x < width; x += 86) {
      k += 1;
      const seed = seed0 + k * 17;
      const px = x + (hash01(seed) - 0.5) * 70 + ((Math.round(y / 34) % 2) * 43);
      const py = y + (hash01(seed + 1) - 0.5) * 24;
      if (!onMountain(shape, px - 20, py) || !onMountain(shape, px + 20, py)) continue;
      const stage = stageAt(edges, px, py);
      const roll = hash01(seed + 2);
      let kind: Patch['kind'] | null = null;
      let r = 0;
      if (stage === 'meadow' && roll < 0.1) [kind, r] = ['clearing', 46 + hash01(seed + 3) * 30];
      else if (stage === 'scree' && roll < 0.2) [kind, r] = ['slab', 14 + hash01(seed + 3) * 12];
      else if (stage === 'scree' && roll < 0.3) [kind, r] = ['snowpatch', 12 + hash01(seed + 3) * 10];
      else if (stage === 'scree' && roll < 0.48) [kind, r] = ['pebbles', 10];
      else if (stage === 'snow' && roll < 0.22) [kind, r] = ['sastrugi', 16 + hash01(seed + 3) * 10];
      if (!kind) continue;
      // Une plaque reste dans son étage et ne glisse pas sous le chemin ni sous un niveau.
      if (stageAt(edges, px - r, py) !== stage || stageAt(edges, px + r, py) !== stage) continue;
      if (kind !== 'clearing' && !clearOfRoute({ x: px, y: py, r }, samples, nodes, 4, 10)) continue;
      if (overlaps([{ x: px, y: py, r: r * 0.6 }], avoid)) continue;
      if (out.some((o) => Math.hypot(o.x - px, o.y - py) < o.r + r)) continue;
      out.push({ kind, x: px, y: py, r, seed });
    }
  }
  return out;
}

export interface Prepared extends MountainPlan {
  patches: Patch[];
}

/** Tous les choix de la montagne, faits une fois par carte. */
export function planMountain(ctx: SceneContext, shape: MountainShape): Prepared {
  const { width, nodes, band } = ctx;
  const samples = ctx.bandSamples;
  const seed = band.worldIndex * 7919 + Math.round(width);
  const edges = buildEdges(shape, width, seed);
  const sky = skyDisks(shape, width);
  const signDisk: Footprint = { x: ctx.sign.x, y: ctx.sign.y - 28, r: 34 };
  const taken: Footprint[] = [...sky, signDisk];
  const places: Placed[] = [];
  const footprints: Footprint[] = [];
  const low = band.bottom - 70; // rien sur la crête du bas
  const high = band.top > 0 ? band.top + 60 : 0;

  const torrent = buildTorrent(ctx, shape, taken);
  const water: Footprint[] = [];
  if (torrent) {
    const pool = CASCADE_SHAPE.map((f) => ({ x: torrent.pool.x + f.x, y: torrent.pool.y + f.y, r: f.r }));
    footprints.push(...pool);
    places.push({ kind: 'cascade', x: torrent.pool.x, y: torrent.pool.y, scale: 1, flip: torrent.side < 0 });
    water.push(
      ...pool,
      ...disksAlong(torrent.stream, STREAM_HALF + 8, 12),
      ...disksAlong(samplePath(torrent.brook, 16), BROOK_HALF + 6, 12),
      { x: torrent.bridge.x, y: torrent.bridge.y, r: 34 },
      // Rien devant la cascade : un sapin au premier plan la cacherait.
      { x: torrent.pool.x, y: torrent.pool.y + 40, r: 36 },
    );
    taken.push(...water);
  }

  /** Place un lieu près de `prefer`, dans la tranche d'altitude [t0, t1] ; rien s'il n'y a pas la place. */
  const place = (kind: string, prefer: Point, t0: number, t1: number, flip = false, margin = 6): Point | null => {
    const scale = PLACE_SCALE[kind] ?? 1;
    const shapeFp = scaled(kind, scale, flip);
    // Il peut déborder du bord de l'écran, d'un tiers de sa largeur au plus.
    const half = Math.max(...shapeFp.map((f) => Math.abs(f.x) + f.r));
    const spot = findSpot({
      shape: shapeFp,
      prefer,
      within: {
        x0: half / 3,
        x1: width - half / 3,
        y0: Math.max(high, yAt(shape, t1)),
        y1: Math.min(low, yAt(shape, t0)),
      },
      samples,
      nodes,
      taken,
      pathMargin: margin,
      nodeMargin: 26,
      step: 8,
    });
    if (!spot) return null;
    const fp = shapeFp.map((f) => ({ x: spot.x + f.x, y: spot.y + f.y, r: f.r }));
    taken.push(...fp);
    footprints.push(...fp);
    places.push({ kind, x: spot.x, y: spot.y, scale, flip });
    return spot;
  };
  /** Côté de la carte le plus loin du chemin à cette altitude. */
  const freeSide = (t: number): number => {
    const y = yAt(shape, t);
    const near = samples.filter((p) => Math.abs(p.y - y) < 90);
    const x = near.reduce((s, p) => s + p.x, 0) / Math.max(1, near.length);
    return x < width / 2 ? width * 0.78 : width * 0.22;
  };

  // Alpage : le chalet, puis les vaches dans le pré.
  const chalet = place('chalet', { x: freeSide(0.15), y: yAt(shape, 0.15) }, 0.04, 0.27);
  const cowSide = chalet && chalet.x < width / 2 ? 0.8 : 0.2;
  place('cow', { x: width * cowSide, y: yAt(shape, 0.07) }, 0.02, 0.28, cowSide > 0.5);
  place('cow', { x: width * (1 - cowSide), y: yAt(shape, 0.24) }, 0.02, 0.29, cowSide < 0.5);
  place('cow', { x: freeSide(0.2), y: yAt(shape, 0.2) }, 0.1, 0.28, true);
  // Pierrier : le bouquetin sur son rocher, la marmotte, un cairn au bord du sentier.
  const ibex = place('ibex', { x: freeSide(0.7), y: yAt(shape, 0.7) }, 0.6, 0.78, freeSide(0.7) > width / 2);
  place('marmot', { x: ibex && ibex.x < width / 2 ? width * 0.8 : width * 0.2, y: yAt(shape, 0.62) }, 0.56, 0.76);
  const cairnAt = samples.find((p) => Math.abs(altitude(shape.climb, p.y) - 0.66) < 0.01);
  if (cairnAt) place('cairn', { x: cairnAt.x + (cairnAt.x < width / 2 ? 46 : -46), y: cairnAt.y }, 0.58, 0.78, false, 4);
  // Neige : le refuge, le bonhomme de neige.
  const refuge = place('refuge', { x: freeSide(0.86), y: yAt(shape, 0.85) }, 0.8, 0.93);
  place('snowman', { x: refuge && refuge.x < width / 2 ? width * 0.75 : width * 0.25, y: yAt(shape, 0.88) }, 0.8, 0.95);

  const avoid = [...footprints, ...water];
  const pines = forestMass(ctx, shape, edges, avoid);
  const treeline = yAt(shape, STAGE_TOPS[1] + 0.06);
  const kindsAt = (x: number, y: number): readonly DecorKind[] => {
    if (!onMountain(shape, x, y) || y < shape.summit.y + 70) return ZONE_KINDS.sky;
    const stage = stageAt(edges, x, y);
    return stage === 'scree' && y > treeline ? ZONE_KINDS.treeline : ZONE_KINDS[stage];
  };
  const semis: Decor[] = placeDecor(band, width, [...samples], [...nodes, ctx.sign], kindsAt, [
    ...avoid,
    signDisk,
    ...pines.map((p) => ({ x: p.x, y: p.y, r: 14 })),
  ]);
  // Le petit décor ne déborde pas dans le ciel à côté de la montagne, et un arbre ne cache pas l'eau
  // ni un lieu derrière lui.
  const onRock = semis.filter(
    (d) =>
      onMountain(shape, d.x - 10, d.y) &&
      onMountain(shape, d.x + 10, d.y) &&
      !(TREES.has(d.kind) && overlaps([{ x: d.x, y: d.y - 30 * d.scale, r: 14 * d.scale }], avoid)),
  );
  const patches = buildPatches(ctx, shape, edges, [...avoid, ...pines.map((p) => ({ x: p.x, y: p.y, r: 10 }))]);
  return { edges, torrent, places, footprints, decor: [...pines, ...onRock], patches };
}
