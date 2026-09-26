// Géométrie de la carte : position des niveaux, tracé du chemin, découpage en mondes, placement du décor.
// Tout est pur (aucun DOM) pour être testé sans navigateur ; les coordonnées sont en pixels CSS.
import { createRng } from '../../engine';

export const NODE_SIZE = 80;
/** Écart vertical moyen entre deux niveaux ; il varie de ±SPACING_JITTER d'un niveau à l'autre. */
export const SPACING = 168;
export const SPACING_JITTER = 0.15;
/** Écart plus grand autour d'une frontière, pour laisser la place au passage (pont, ponton, col). */
export const BORDER_SPACING = 224;
export const TOP_PAD = 120;
export const BOTTOM_PAD = 140;
/** Largeur visible du chemin (bordure comprise). */
export const PATH_WIDTH = 56;

/** Nombre de niveaux d'un monde avant de changer d'univers. */
export const LEVELS_PER_WORLD = 16;

export type WorldId = 'forest' | 'sea' | 'mountain';
/** Ordre des mondes ; au-delà du dernier, on reboucle. */
export const WORLD_ORDER: readonly WorldId[] = ['forest', 'sea', 'mountain'];

export interface Point {
  x: number;
  y: number;
}

export function trackHeightFor(count: number): number {
  return TOP_PAD + BOTTOM_PAD + nodeRise(Math.max(0, count - 1));
}

/** Demi-hauteur de la bande frontière (rivière, plage, crête), et demi-longueur du passage rectiligne. */
export const BORDER_HALF = 30;
export const PASSAGE_HALF = 44;

/** Hasard déterministe indexé (sans état) : même carte à chaque visite, quel que soit l'ordre des appels. */
function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Écart vertical entre le niveau `i` et le suivant. */
function gapAfter(i: number): number {
  if ((i + 1) % LEVELS_PER_WORLD === 0) return BORDER_SPACING;
  return Math.round(SPACING * (1 - SPACING_JITTER + hash01(i * 7 + 4) * 2 * SPACING_JITTER));
}

const riseCache: number[] = [0];

/** Hauteur du niveau `index` au-dessus du niveau 0, indépendante du nombre de niveaux. */
function nodeRise(index: number): number {
  while (riseCache.length <= index) {
    const i = riseCache.length - 1;
    riseCache.push((riseCache[i] as number) + gapAfter(i));
  }
  return riseCache[index] as number;
}

/** Motifs de 4 niveaux, en fraction de largeur : c'est leur enchaînement qui fait varier les angles. */
const MOTIFS: readonly (readonly number[])[] = [
  [0.28, 0.72, 0.3, 0.7], // zigzag serré
  [0.24, 0.4, 0.58, 0.76], // longue traversée en diagonale
  [0.5, 0.76, 0.66, 0.34], // grand virage
  [0.36, 0.64, 0.74, 0.46], // vague
];
const MOTIF_LEN = 4;

const xCache: number[] = [];

/** Abscisse du passage entre le monde `worldIndex - 1` et `worldIndex`, en fraction de largeur. */
function bridgeFraction(worldIndex: number): number {
  return 0.38 + hash01(worldIndex * 31 + 7) * 0.24;
}

/** Les deux niveaux qui encadrent un passage s'alignent sur lui : on y arrive tout droit. */
function bridgeWorldAt(index: number): number | null {
  const k = index % LEVELS_PER_WORLD;
  if (k === 0 && index > 0) return worldIndexForLevel(index);
  if (k === LEVELS_PER_WORLD - 1) return worldIndexForLevel(index) + 1;
  return null;
}

/** Abscisse (fraction de largeur) du niveau `index`, indépendante du nombre de niveaux. */
function xFraction(index: number): number {
  while (xCache.length <= index) {
    const i = xCache.length;
    const block = Math.floor(i / MOTIF_LEN);
    // Motif du bloc : tiré au hasard, jamais deux fois le même d'affilée ; miroir gauche/droite aléatoire.
    let m = Math.floor(hash01(block * 101 + 3) * MOTIFS.length);
    const prev = block > 0 ? Math.floor(hash01((block - 1) * 101 + 3) * MOTIFS.length) : -1;
    if (m === prev) m = (m + 1) % MOTIFS.length;
    const mirror = hash01(block * 53 + 11) < 0.5;
    const base = (MOTIFS[m] as readonly number[])[i % MOTIF_LEN] as number;
    const jitter = (hash01(i * 17 + 1) - 0.5) * 0.08;
    const bridgeWorld = bridgeWorldAt(i);
    xCache.push(bridgeWorld !== null ? bridgeFraction(bridgeWorld) : (mirror ? 1 - base : base) + jitter);
  }
  return xCache[index] as number;
}

/** Niveau 0 en bas ; le chemin monte en enchaînant zigzags, traversées et virages. */
export function nodePosition(index: number, count: number, width: number): Point {
  const height = trackHeightFor(count);
  return {
    x: xFraction(index) * width,
    y: height - BOTTOM_PAD - nodeRise(index),
  };
}

export function worldIdAt(worldIndex: number): WorldId {
  return WORLD_ORDER[worldIndex % WORLD_ORDER.length] as WorldId;
}

export function worldIndexForLevel(levelIndex: number): number {
  return Math.floor(levelIndex / LEVELS_PER_WORLD);
}

/** Ordonnée de la frontière sous le monde `worldIndex` (≥ 1) : à mi-chemin entre deux niveaux. */
function boundaryY(worldIndex: number, count: number): number {
  const first = worldIndex * LEVELS_PER_WORLD;
  return trackHeightFor(count) - BOTTOM_PAD - (nodeRise(first - 1) + nodeRise(first)) / 2;
}

/**
 * Manière de passer d'un monde à l'autre, selon le monde d'arrivée :
 * un ponton qui avance dans la mer, un col rocheux vers la montagne, un pont sur la rivière vers la forêt.
 */
export type PassageKind = 'pier' | 'pass' | 'bridge';

export const PASSAGE_BY_WORLD: Record<WorldId, PassageKind> = {
  sea: 'pier',
  mountain: 'pass',
  forest: 'bridge',
};

export interface Passage {
  /** Monde auquel le passage donne accès. */
  worldIndex: number;
  world: WorldId;
  kind: PassageKind;
  x: number;
  y: number;
}

/** Un passage par frontière entre deux mondes, là où le chemin la franchit. */
export function passages(count: number, width: number): Passage[] {
  const out: Passage[] = [];
  for (let w = 1; w * LEVELS_PER_WORLD < count; w += 1) {
    const world = worldIdAt(w);
    out.push({
      worldIndex: w,
      world,
      kind: PASSAGE_BY_WORLD[world],
      x: bridgeFraction(w) * width,
      y: boundaryY(w, count),
    });
  }
  return out;
}

export interface Route {
  /** Points de passage de la courbe lisse (niveaux, virages, extrémités du pont…). */
  points: Point[];
  /** Indice, dans `points`, du point de chaque niveau. */
  nodeAt: number[];
}

/**
 * Tracé complet : entre deux niveaux proches en abscisse, un virage vient parfois bomber le chemin ;
 * à chaque frontière, deux points alignés rendent le passage (pont, ponton, col) parfaitement droit.
 */
export function buildRoute(count: number, width: number): Route {
  if (count === 0) return { points: [], nodeAt: [] };
  const height = trackHeightFor(count);
  const points: Point[] = [];
  const nodeAt: number[] = [];
  const first = nodePosition(0, count, width);
  points.push({ x: first.x, y: height + 20 });
  for (let i = 0; i < count; i += 1) {
    const a = nodePosition(i, count, width);
    nodeAt.push(points.length);
    points.push(a);
    if (i === count - 1) break;
    const b = nodePosition(i + 1, count, width);
    if ((i + 1) % LEVELS_PER_WORLD === 0) {
      const w = worldIndexForLevel(i + 1);
      const y = boundaryY(w, count);
      points.push({ x: a.x, y: y + PASSAGE_HALF }, { x: a.x, y: y - PASSAGE_HALF });
      continue;
    }
    const dx = Math.abs(b.x - a.x) / width;
    if (dx < 0.22 && hash01(i * 13 + 5) < 0.55) {
      // Virage : le milieu est poussé du côté où il y a le plus de place.
      const mid = (a.x + b.x) / 2 / width;
      const side = mid < 0.5 ? 1 : -1;
      const bulge = 0.16 + hash01(i * 29 + 2) * 0.08;
      const x = Math.min(0.88, Math.max(0.12, mid + side * bulge));
      points.push({ x: x * width, y: (a.y + b.y) / 2 });
    }
  }
  points.push({ x: width / 2, y: -20 });
  return { points, nodeAt };
}

/** Points de passage du chemin : il entre par le bas de l'écran et ressort par le haut. */
export function pathWaypoints(count: number, width: number): Point[] {
  return buildRoute(count, width).points;
}

/** Segment de Catmull-Rom (tension 0,5) converti en courbe de Bézier cubique. */
function bezierControls(p0: Point, p1: Point, p2: Point, p3: Point): [Point, Point] {
  return [
    { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  ];
}

function segmentAt(points: Point[], i: number): [Point, Point, Point, Point] {
  const p1 = points[i] as Point;
  const p2 = points[i + 1] as Point;
  const p0 = points[i - 1] ?? p1;
  const p3 = points[i + 2] ?? p2;
  const [c1, c2] = bezierControls(p0, p1, p2, p3);
  return [p1, c1, c2, p2];
}

/** Attribut `d` SVG d'une courbe lisse passant par tous les points. */
export function smoothPathD(points: Point[]): string {
  if (points.length < 2) return '';
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${r((points[0] as Point).x)} ${r((points[0] as Point).y)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [, c1, c2, p2] = segmentAt(points, i);
    d += ` C ${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d;
}

/** Point à la fraction `t` (0…1) du segment `i` de la courbe lisse (entre `points[i]` et `points[i + 1]`). */
export function pointOnSegment(points: Point[], i: number, t: number): Point {
  const [a, b, c, d] = segmentAt(points, i);
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

/** Point à la fraction `t` (0…1), en longueur parcourue, du trajet entre le niveau `from` et le suivant. */
export function pointBetweenNodes(route: Route, from: number, t: number): Point {
  const start = route.nodeAt[from] as number;
  const end = route.nodeAt[from + 1] ?? start;
  const samples: Point[] = [];
  for (let i = start; i < end; i += 1) {
    for (let s = 0; s < 16; s += 1) samples.push(pointOnSegment(route.points, i, s / 16));
  }
  samples.push(route.points[end] as Point);
  const lengths = [0];
  for (let i = 1; i < samples.length; i += 1) {
    const p = samples[i] as Point;
    const q = samples[i - 1] as Point;
    lengths.push((lengths[i - 1] as number) + Math.hypot(p.x - q.x, p.y - q.y));
  }
  const target = Math.max(0, Math.min(1, t)) * (lengths[lengths.length - 1] as number);
  const k = Math.max(
    1,
    lengths.findIndex((l) => l >= target),
  );
  const l0 = lengths[k - 1] as number;
  const l1 = lengths[k] as number;
  const f = l1 > l0 ? (target - l0) / (l1 - l0) : 0;
  const a = samples[k - 1] as Point;
  const b = samples[k] ?? a;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Échantillonne la courbe lisse (pour tenir le décor à distance du chemin). */
export function samplePath(points: Point[], stepsPerSegment = 12): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let s = 0; s < stepsPerSegment; s += 1) out.push(pointOnSegment(points, i, s / stepsPerSegment));
  }
  if (points.length > 0) out.push(points[points.length - 1] as Point);
  return out;
}

export interface WorldBand {
  worldIndex: number;
  world: WorldId;
  /** Bord haut (y plus petit) et bas de la bande, en px. */
  top: number;
  bottom: number;
}

/** Bandes verticales des mondes ; la frontière passe à mi-chemin entre deux niveaux. */
export function worldBands(count: number): WorldBand[] {
  if (count === 0) return [];
  const height = trackHeightFor(count);
  const worldCount = worldIndexForLevel(count - 1) + 1;
  const bands: WorldBand[] = [];
  for (let w = 0; w < worldCount; w += 1) {
    const bottom = w === 0 ? height : boundaryY(w, count);
    const top = w === worldCount - 1 ? 0 : boundaryY(w + 1, count);
    bands.push({ worldIndex: w, world: worldIdAt(w), top, bottom });
  }
  return bands;
}

export interface DecorKind {
  kind: string;
  /** Rayon d'encombrement au sol, en px (échelle 1). */
  radius: number;
  weight: number;
}

export const DECOR_KINDS: Record<WorldId, readonly DecorKind[]> = {
  forest: [
    { kind: 'tree', radius: 30, weight: 5 },
    { kind: 'pine', radius: 24, weight: 4 },
    { kind: 'bush', radius: 18, weight: 3 },
    { kind: 'mushroom', radius: 10, weight: 1 },
    { kind: 'flower', radius: 8, weight: 3 },
    { kind: 'grass', radius: 8, weight: 3 },
  ],
  sea: [
    { kind: 'wave', radius: 16, weight: 6 },
    { kind: 'island', radius: 34, weight: 2 },
    { kind: 'fish', radius: 12, weight: 2 },
    { kind: 'rock', radius: 14, weight: 2 },
    { kind: 'shell', radius: 8, weight: 1 },
  ],
  mountain: [
    { kind: 'peak', radius: 44, weight: 2 },
    { kind: 'pine', radius: 22, weight: 5 },
    { kind: 'rock', radius: 16, weight: 3 },
    { kind: 'flower', radius: 8, weight: 2 },
    { kind: 'grass', radius: 8, weight: 2 },
  ],
};

export interface Decor {
  kind: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
}

/** Marge libre autour du chemin et des niveaux (étoiles comprises). */
const PATH_CLEARANCE = PATH_WIDTH / 2 + 6;
const NODE_CLEARANCE = NODE_SIZE / 2 + 26;
const CELL = 46;

function pickWeighted(kinds: readonly DecorKind[], r: number): DecorKind {
  const total = kinds.reduce((sum, k) => sum + k.weight, 0);
  let acc = r * total;
  for (const k of kinds) {
    acc -= k.weight;
    if (acc < 0) return k;
  }
  return kinds[kinds.length - 1] as DecorKind;
}

/**
 * Décor d'une bande : grille jittée, hasard déterministe (même carte à chaque visite),
 * sans chevaucher le chemin, les niveaux ni un autre élément. Trié de haut en bas (profondeur).
 */
export function placeDecor(band: WorldBand, width: number, pathSamples: Point[], nodes: Point[]): Decor[] {
  const rng = createRng(0x5eed + band.worldIndex * 7919 + Math.round(width));
  const kinds = DECOR_KINDS[band.world];
  const placed: Array<Decor & { radius: number }> = [];
  const nearby = pathSamples.filter((p) => p.y >= band.top - 80 && p.y <= band.bottom + 80);

  for (let y = band.top + CELL / 2; y < band.bottom; y += CELL) {
    for (let x = CELL / 2 - 10; x < width + 10; x += CELL) {
      if (rng.next() > 0.62) continue;
      const kind = pickWeighted(kinds, rng.next());
      const scale = 0.8 + rng.next() * 0.45;
      const radius = kind.radius * scale;
      const px = x + (rng.next() - 0.5) * CELL * 0.8;
      const py = y + (rng.next() - 0.5) * CELL * 0.8;
      if (py < band.top + radius * 0.5 || py > band.bottom) continue;
      // Rien sur la frontière : ni au bord de celle d'en bas, ni dépassant sur celle d'en haut.
      if (band.worldIndex > 0 && py > band.bottom - BORDER_HALF - 10) continue;
      if (band.top > 0 && py - radius * 1.6 < band.top + BORDER_HALF + 6) continue;
      const clearOf = (pts: Point[], min: number) =>
        pts.every((p) => (p.x - px) ** 2 + (p.y - py) ** 2 >= min * min);
      if (!clearOf(nearby, PATH_CLEARANCE + radius)) continue;
      if (!clearOf(nodes, NODE_CLEARANCE + radius)) continue;
      if (!placed.every((d) => (d.x - px) ** 2 + (d.y - py) ** 2 >= (d.radius + radius) ** 2 * 0.7)) continue;
      placed.push({ kind: kind.kind, x: px, y: py, scale, flip: rng.next() < 0.5, radius });
    }
  }
  return placed.sort((a, b) => a.y - b.y).map(({ radius: _r, ...d }) => d);
}

/**
 * Panneau d'entrée d'un monde : à côté du premier niveau pour le premier monde,
 * sinon sur la berge d'arrivée, juste à côté du pont, du côté où il y a de la place.
 */
export function signPosition(band: WorldBand, width: number, count: number): Point {
  if (band.worldIndex === 0) {
    const first = nodePosition(0, count, width);
    return {
      x: first.x + (first.x < width / 2 ? 84 : -84),
      y: trackHeightFor(count) - 56,
    };
  }
  const x = bridgeFraction(band.worldIndex) * width;
  return {
    x: x + (x < width / 2 ? 80 : -80),
    y: band.bottom - BORDER_HALF - 12,
  };
}

/** Décor de fond d'une partie : une vue rapprochée du monde en cours (même dessins que la carte). */
export const BACKDROP_WIDTH = 400;
export const BACKDROP_HEIGHT = 800;
const BACKDROP_CELL = 72;
const BACKDROP_SCALE = 1.5;

/** Même hasard déterministe à chaque partie d'un monde : le fond ne « saute » pas d'un niveau à l'autre. */
export function backdropDecor(world: WorldId): Decor[] {
  const rng = createRng(0xbacd + WORLD_ORDER.indexOf(world) * 104729);
  const kinds = DECOR_KINDS[world];
  const placed: Array<Decor & { radius: number }> = [];
  for (let y = BACKDROP_CELL; y < BACKDROP_HEIGHT + BACKDROP_CELL / 2; y += BACKDROP_CELL) {
    for (let x = BACKDROP_CELL / 2; x < BACKDROP_WIDTH; x += BACKDROP_CELL) {
      if (rng.next() > 0.7) continue;
      const kind = pickWeighted(kinds, rng.next());
      const scale = BACKDROP_SCALE * (0.85 + rng.next() * 0.35);
      const radius = kind.radius * scale;
      const px = x + (rng.next() - 0.5) * BACKDROP_CELL * 0.8;
      const py = y + (rng.next() - 0.5) * BACKDROP_CELL * 0.8;
      if (!placed.every((d) => (d.x - px) ** 2 + (d.y - py) ** 2 >= (d.radius + radius) ** 2 * 0.7)) continue;
      placed.push({ kind: kind.kind, x: px, y: py, scale, flip: rng.next() < 0.5, radius });
    }
  }
  return placed.sort((a, b) => a.y - b.y).map(({ radius: _r, ...d }) => d);
}
