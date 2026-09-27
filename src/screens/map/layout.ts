// Géométrie de la carte : position des niveaux, tracé du chemin, découpage en mondes, placement du décor.
// Tout est pur (aucun DOM) pour être testé sans navigateur ; les coordonnées sont en pixels CSS.
import { createRng } from '../../engine';

export const NODE_SIZE = 80;
/** Écart vertical moyen entre deux niveaux ; il varie de ±SPACING_JITTER d'un niveau à l'autre. */
export const SPACING = 168;
export const SPACING_JITTER = 0.15;
/** Écart plus grand autour d'une frontière, pour laisser la place au passage (pont, ponton, col). */
export const BORDER_SPACING = 224;
/** Du dernier niveau de la montagne (au sommet) au premier des nuages : le sommet, du ciel, l'échelle. */
export const SUMMIT_SPACING = 440;
/** Resserrement du chemin en montagne : au sommet, ses virages sont MOUNTAIN_NARROWING fois moins larges. */
const MOUNTAIN_NARROWING = 0.55;
/** Hauteur de la pointe du sommet au-dessus du dernier niveau de la montagne. */
export const SUMMIT_RISE = 150;
export const TOP_PAD = 120;
export const BOTTOM_PAD = 140;
/** Largeur visible du chemin (bordure comprise) : un sentier, plus étroit que les niveaux posés dessus. */
export const PATH_WIDTH = 38;

/** Nombre de niveaux d'un monde avant de changer d'univers. */
export const LEVELS_PER_WORLD = 16;

export type WorldId = 'forest' | 'sea' | 'mountain' | 'clouds';
/** Ordre des mondes ; au-delà du dernier, on reboucle. */
export const WORLD_ORDER: readonly WorldId[] = ['forest', 'sea', 'mountain', 'clouds'];

export interface Point {
  x: number;
  y: number;
}

export function trackHeightFor(count: number): number {
  // Parcours qui s'achève en montagne : de la place au-dessus du dernier niveau pour le sommet et le ciel.
  const summit = count > 0 && isMountainLevel(count - 1) ? SUMMIT_RISE + 70 : 0;
  return TOP_PAD + summit + BOTTOM_PAD + nodeRise(Math.max(0, count - 1));
}

/** Demi-hauteur de la bande frontière (rivière, plage, crête), et demi-longueur du passage rectiligne. */
export const BORDER_HALF = 30;
export const PASSAGE_HALF = 44;

/** Hasard déterministe indexé (sans état) : même carte à chaque visite, quel que soit l'ordre des appels. */
export function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Écart vertical entre le niveau `i` et le suivant. */
function gapAfter(i: number): number {
  if ((i + 1) % LEVELS_PER_WORLD === 0) return isMountainLevel(i) ? SUMMIT_SPACING : BORDER_SPACING;
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
    let x = (mirror ? 1 - base : base) + jitter;
    if (isMountainLevel(i)) {
      // Montagne : le chemin serpente de moins en moins large en montant, jusqu'à la pointe.
      const f = (i % LEVELS_PER_WORLD) / (LEVELS_PER_WORLD - 1);
      x = 0.5 + (x - 0.5) * (1 - MOUNTAIN_NARROWING * f);
    }
    xCache.push(bridgeWorld !== null ? bridgeFraction(bridgeWorld) : x);
  }
  return xCache[index] as number;
}

function isMountainLevel(index: number): boolean {
  return worldIdAt(worldIndexForLevel(index)) === 'mountain';
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
 * un ponton qui avance dans la mer, un col rocheux vers la montagne, le sommet qui perce la mer de
 * nuages vers le ciel, un pont sur la rivière vers la forêt.
 */
export type PassageKind = 'pier' | 'pass' | 'summit' | 'bridge';

export const PASSAGE_BY_WORLD: Record<WorldId, PassageKind> = {
  sea: 'pier',
  mountain: 'pass',
  clouds: 'summit',
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
  const last = points[points.length - 1] as Point;
  if (isMountainLevel(count - 1)) {
    // Le parcours s'arrête au sommet : le chemin grimpe tout droit jusqu'à la pointe, puis sort
    // (masqué au-dessus de la pointe, dans le ciel).
    points.push({ x: last.x, y: last.y - SUMMIT_RISE / 2 }, { x: last.x, y: -20 });
  } else {
    points.push({ x: width / 2, y: -20 });
  }
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
  /** Hauteur du dessin au-dessus de son point d'appui (px, échelle 1), quand elle risque de
   * recouvrir le chemin : on vérifie alors aussi que la silhouette reste à l'écart. */
  tall?: number;
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
    { kind: 'peak', radius: 44, weight: 2, tall: 112 },
    { kind: 'pine', radius: 22, weight: 5 },
    { kind: 'crag', radius: 16, weight: 3 },
    { kind: 'flower', radius: 8, weight: 2 },
    { kind: 'grass', radius: 8, weight: 2 },
  ],
  clouds: [
    { kind: 'cloud', radius: 26, weight: 7 },
    { kind: 'star', radius: 8, weight: 2 },
    { kind: 'balloon', radius: 16, weight: 0.25, tall: 52 },
    { kind: 'rainbow', radius: 26, weight: 0.4 },
    { kind: 'bird', radius: 9, weight: 2 },
  ],
};

/**
 * Une grande montagne verte vue de face, piquée d'arbres ; plus haut, des sapins et des rochers ;
 * une calotte de neige à la pointe. À côté, les montagnes voisines (mêmes arbres) puis le ciel.
 * Le fond d'une partie garde `DECOR_KINDS.mountain`.
 */
export const MOUNTAIN_ZONES = {
  meadow: [
    { kind: 'tree', radius: 30, weight: 4 },
    { kind: 'pine', radius: 22, weight: 5 },
    { kind: 'bush', radius: 18, weight: 3 },
    { kind: 'flower', radius: 8, weight: 3 },
    { kind: 'grass', radius: 8, weight: 3 },
    { kind: 'crag', radius: 16, weight: 1 },
  ],
  high: [
    { kind: 'pine', radius: 22, weight: 5 },
    { kind: 'crag', radius: 16, weight: 3 },
    { kind: 'grass', radius: 8, weight: 1 },
  ],
  // Un ciel dégagé : la plupart des cases restent vides (type '').
  sky: [
    { kind: 'cloud', radius: 26, weight: 2 },
    { kind: 'bird', radius: 9, weight: 1 },
    { kind: '', radius: 26, weight: 6 },
  ],
} as const satisfies Record<string, readonly DecorKind[]>;

/** Au-dessus de cette altitude (0 au pied, 1 à la pointe), la montagne se fait plus rude. */
export const MOUNTAIN_HIGH_FROM = 0.72;
/** Hauteur de la calotte de neige sous la pointe (px). */
export const SNOW_CAP = 70;
/** Les montagnes voisines culminent à cette altitude : au-dessus, à côté de la grande, le ciel. */
export const NEIGHBOURS_TOP = 0.55;
/** Demi-largeur du sommet, de part et d'autre du chemin. */
const SUMMIT_HALF = 4;
/** Évasement de la pointe : demi-largeur gagnée par pixel de descente. */
const SUMMIT_SLOPE = 0.34;
/** Retrait maximal d'un flanc par pixel de montée. */
const FLANK_MAX_SLOPE = 1.7;
/** Marge minimale entre un flanc et le chemin, puis un niveau (étoiles comprises). */
const FLANK_PATH_CLEAR = PATH_WIDTH / 2 + 18;
const FLANK_NODE_CLEAR = NODE_SIZE / 2 + 22;
const FLANK_STEP = 12;

export interface MountainShape {
  /** Du haut vers le bas de la bande, pas de FLANK_STEP : ordonnée et bords gauche/droit du massif. */
  rows: Array<{ y: number; left: number; right: number }>;
  /** La pointe du sommet. */
  summit: Point;
  /** La bande ramenée du pied à la pointe : c'est sur elle que se lisent les étages. */
  climb: WorldBand;
}

/** Hauteur relative (0 au pied, 1 au sommet) d'une ordonnée dans la bande. */
export function altitude(band: WorldBand, y: number): number {
  return Math.max(0, Math.min(1, (band.bottom - y) / (band.bottom - band.top)));
}

/**
 * Silhouette de la montagne dans sa bande : pleine largeur au pied, puis des flancs qui se
 * resserrent jusqu'au sommet, là où le chemin sort de la bande. Les flancs s'écartent toujours
 * assez pour laisser le chemin et les niveaux sur la roche.
 */
export function mountainShape(
  band: WorldBand,
  width: number,
  samples: readonly Point[],
  nodes: readonly Point[],
): MountainShape {
  // La pointe, au-dessus du plus haut niveau de la bande : au-delà, c'est le ciel.
  const inBand = nodes.filter((n) => n.y > band.top && n.y < band.bottom);
  const top = inBand.reduce((best, n) => (n.y < best.y ? n : best), inBand[0] ?? { x: width / 2, y: band.top });
  const apex = { x: top.x, y: Math.max(band.top + 8, top.y - SUMMIT_RISE) };
  const climb: WorldBand = { ...band, top: apex.y };
  const summitX = apex.x;
  const raw: Array<{ y: number; left: number; right: number }> = [];
  for (let y = apex.y; y <= band.bottom + FLANK_STEP / 2; y += FLANK_STEP) {
    // Une grande montagne vue de face : des flancs droits qui s'évasent depuis la pointe.
    const half = SUMMIT_HALF + (y - apex.y) * SUMMIT_SLOPE;
    let left = summitX - half;
    let right = summitX + half;
    for (const p of samples) {
      // Au-dessus du dernier niveau, le chemin file droit vers la pointe (et l'échelle) : il ne
      // doit pas élargir le sommet.
      if (Math.abs(p.y - y) > FLANK_STEP * 2 || p.y < top.y - NODE_SIZE / 2) continue;
      left = Math.min(left, p.x - FLANK_PATH_CLEAR);
      right = Math.max(right, p.x + FLANK_PATH_CLEAR);
    }
    for (const n of nodes) {
      if (Math.abs(n.y - y) > NODE_SIZE / 2 + FLANK_STEP) continue;
      left = Math.min(left, n.x - FLANK_NODE_CLEAR);
      right = Math.max(right, n.x + FLANK_NODE_CLEAR);
    }
    raw.push({ y, left, right });
  }
  // Lissage qui ne rogne jamais : minimum (resp. maximum) glissant, puis moyenne glissante.
  const win = 3;
  const eroded = raw.map((r, i) => {
    const near = raw.slice(Math.max(0, i - win), i + win + 1);
    return { y: r.y, left: Math.min(...near.map((n) => n.left)), right: Math.max(...near.map((n) => n.right)) };
  });
  const rows = eroded.map((r, i) => {
    const near = eroded.slice(Math.max(0, i - win), i + win + 1);
    return {
      y: Math.min(r.y, band.bottom),
      left: near.reduce((sum, n) => sum + n.left, 0) / near.length,
      right: near.reduce((sum, n) => sum + n.right, 0) / near.length,
    };
  });
  // Au-dessus du dernier niveau, rien à dégager : une vraie pointe, aux flancs droits (le lissage
  // l'aurait émoussée).
  const tipEnd = top.y - NODE_SIZE / 2 - FLANK_STEP;
  for (const row of rows) {
    if (row.y >= tipEnd) break;
    const half = SUMMIT_HALF + (row.y - apex.y) * SUMMIT_SLOPE;
    row.left = Math.max(row.left, apex.x - half);
    row.right = Math.min(row.right, apex.x + half);
  }
  // Pas de marche : en montant, un flanc ne rentre jamais plus vite que FLANK_MAX_SLOPE.
  for (let i = rows.length - 2; i >= 0; i -= 1) {
    const row = rows[i] as { left: number; right: number };
    const below = rows[i + 1] as { left: number; right: number };
    row.left = Math.min(row.left, below.left + FLANK_MAX_SLOPE * FLANK_STEP);
    row.right = Math.max(row.right, below.right - FLANK_MAX_SLOPE * FLANK_STEP);
  }
  return { rows, summit: apex, climb };
}

/** Le point (x, y) est-il sur la montagne (et non dans le ciel à côté) ? */
export function onMountain(shape: MountainShape, x: number, y: number): boolean {
  const first = shape.rows[0];
  if (!first) return false;
  if (y < first.y) return false;
  const i = Math.min(shape.rows.length - 1, Math.round((y - first.y) / FLANK_STEP));
  const row = shape.rows[i] as { left: number; right: number };
  return x > row.left && x < row.right;
}

/** Décor de la montagne selon l'endroit : ciel à côté des flancs, sinon l'étage (prairie, rocher, neige). */
export function mountainKindsAt(band: WorldBand, shape: MountainShape) {
  void band;
  return (x: number, y: number): readonly DecorKind[] => {
    const t = altitude(shape.climb, y);
    if (!onMountain(shape, x, y)) return t < NEIGHBOURS_TOP ? MOUNTAIN_ZONES.meadow : MOUNTAIN_ZONES.sky;
    return t >= MOUNTAIN_HIGH_FROM ? MOUNTAIN_ZONES.high : MOUNTAIN_ZONES.meadow;
  };
}

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
export function placeDecor(
  band: WorldBand,
  width: number,
  pathSamples: Point[],
  nodes: Point[],
  kindsAt?: (x: number, y: number) => readonly DecorKind[],
): Decor[] {
  const rng = createRng(0x5eed + band.worldIndex * 7919 + Math.round(width));
  const kinds = DECOR_KINDS[band.world];
  const placed: Array<Decor & { radius: number }> = [];
  const nearby = pathSamples.filter((p) => p.y >= band.top - 80 && p.y <= band.bottom + 80);

  for (let y = band.top + CELL / 2; y < band.bottom; y += CELL) {
    for (let x = CELL / 2 - 10; x < width + 10; x += CELL) {
      if (rng.next() > 0.62) continue;
      const pick = rng.next();
      const scale = 0.8 + rng.next() * 0.45;
      const px = x + (rng.next() - 0.5) * CELL * 0.8;
      const py = y + (rng.next() - 0.5) * CELL * 0.8;
      // Tirage conservé même quand le type dépend de l'endroit : les autres mondes ne bougent pas.
      const kind = pickWeighted(kindsAt ? kindsAt(px, py) : kinds, pick);
      if (kind.kind === '') continue; // case laissée vide exprès
      const radius = kind.radius * scale;
      const tall = (kind.tall ?? 0) * scale;
      if (py < band.top + radius * 0.5 || py > band.bottom) continue;
      // Rien sur la frontière : ni au bord de celle d'en bas, ni dépassant sur celle d'en haut.
      if (band.worldIndex > 0 && py > band.bottom - BORDER_HALF - 10) continue;
      if (band.top > 0 && py - Math.max(radius * 1.6, tall) < band.top + BORDER_HALF + 6) continue;
      const clearOf = (pts: Point[], min: number, cy = py) =>
        pts.every((p) => (p.x - px) ** 2 + (p.y - cy) ** 2 >= min * min);
      if (!clearOf(nearby, PATH_CLEARANCE + radius)) continue;
      if (!clearOf(nodes, NODE_CLEARANCE + radius)) continue;
      // Silhouette haute (pic, montgolfière) : elle ne doit pas masquer le chemin ni un niveau plus haut.
      if (tall > 0) {
        const hidesSomething = [1, 2, 3].some((k) => {
          const cy = py - (tall * k) / 3;
          const half = radius * (1 - k / 4);
          return !clearOf(nearby, PATH_WIDTH / 2 + half, cy) || !clearOf(nodes, NODE_SIZE / 2 + half, cy);
        });
        if (hidesSomething) continue;
      }
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

/**
 * Un élément minéral posé sur le sentier (en pixels de la carte) :
 * - `rock` : caillou taillé à facettes (le plus fréquent) ;
 * - `heap` : petit tas de gravillons aux tons du chemin (rare) ;
 * - `slab` : dalle plate enfoncée au ras du sol (très rare).
 * `rx` est le rayon d'emprise : tout le dessin tient dans ce disque.
 */
export interface PathStone {
  kind: 'rock' | 'heap' | 'slab';
  x: number;
  y: number;
  rx: number;
  /** Rotation en degrés (ignorée pour un tas, toujours posé droit). */
  rotate: number;
  /** 0, 1 ou 2 : trois teintes pour éviter l'effet tampon. */
  tone: 0 | 1 | 2;
  /** Graine du dessin (contour irrégulier, grains du tas). */
  seed: number;
}

/** Distance minimale entre un groupe de cailloux et un niveau ou un passage (pont, ponton, col). */
const STONE_CLEAR_NODE = NODE_SIZE / 2 + 18;
const STONE_CLEAR_PASSAGE = PASSAGE_HALF + 16;
/** Un groupe tous les ~STONE_EVERY échantillons du chemin, en moyenne. */
const STONE_EVERY = 5;
/** Écart habituel entre deux échantillons du chemin (px) : au-dessous, les cailloux se font plus rares. */
const STONE_STEP_REF = 12;
/** Part des groupes qui deviennent une dalle, puis un tas ; le reste, des cailloux. */
const SLAB_SHARE = 0.07;
const HEAP_SHARE = 0.22;
/** Marge entre l'emprise d'un élément et le bord du sentier. */
const STONE_EDGE_MARGIN = 1.5;

/**
 * Cailloux taillés (1 à 3), de loin en loin un petit tas de gravillons, très rarement une dalle,
 * semés sur le sentier, jamais sous un niveau ni sur un passage.
 * Déterministe : la même carte donne toujours les mêmes éléments.
 */
export function pathStones(samples: readonly Point[], avoid: readonly Point[], passageCenters: readonly Point[]): PathStone[] {
  const out: PathStone[] = [];
  const half = PATH_WIDTH / 2;
  for (let i = 1; i < samples.length - 1; i += 1) {
    const p = samples[i] as Point;
    // Fréquence à la longueur : là où le tracé est finement découpé (lacets), les échantillons se
    // resserrent sans que le chemin s'allonge d'autant.
    const step = Math.hypot(p.x - (samples[i - 1] as Point).x, p.y - (samples[i - 1] as Point).y);
    if (hash01(i * 7 + 3) > Math.min(1, step / STONE_STEP_REF) / STONE_EVERY) continue;
    if (avoid.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < STONE_CLEAR_NODE)) continue;
    if (passageCenters.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < STONE_CLEAR_PASSAGE)) continue;
    const prev = samples[i - 1] as Point;
    const next = samples[i + 1] as Point;
    const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
    // Normale au chemin : les éléments s'écartent de l'axe, plutôt vers les bords (moins foulés).
    const nx = -(next.y - prev.y) / len;
    const ny = (next.x - prev.x) / len;
    const tx = (next.x - prev.x) / len;
    const ty = (next.y - prev.y) / len;
    const side = hash01(i * 17 + 5) < 0.5 ? -1 : 1;
    const roll = hash01(i * 7919 + 4242);
    const kind: PathStone['kind'] = roll < SLAB_SHARE ? 'slab' : roll < SLAB_SHARE + HEAP_SHARE ? 'heap' : 'rock';
    const count = kind === 'rock' ? 1 + Math.floor(hash01(i * 13 + 1) * 3) : 1;
    for (let k = 0; k < count; k += 1) {
      const seed = i * 31 + k * 101;
      const rx =
        kind === 'slab'
          ? 5.5 + hash01(seed) * 2.5
          : kind === 'heap'
            ? 5 + hash01(seed) * 4.5
            : (k === 0 ? 5 : 3.2) + hash01(seed) * 2.8;
      const wanted = half * 0.1 + hash01(seed + 2) * half * 0.42;
      const across = side * Math.min(wanted, half - STONE_EDGE_MARGIN - rx);
      const along = (k - (count - 1) / 2) * 9 + (hash01(seed + 3) - 0.5) * 4;
      out.push({
        kind,
        x: p.x + nx * across + tx * along,
        y: p.y + ny * across + ty * along,
        rx,
        rotate: Math.round(hash01(seed + 4) * 180),
        tone: Math.floor(hash01(seed + 5) * 3) as 0 | 1 | 2,
        seed,
      });
    }
  }
  return out;
}
