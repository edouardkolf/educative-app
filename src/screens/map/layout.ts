// Géométrie de la carte : position des niveaux, tracé du chemin, découpage en mondes, placement du décor.
// Tout est pur (aucun DOM) pour être testé sans navigateur ; les coordonnées sont en pixels CSS.
import { createRng } from '../../engine';

export const NODE_SIZE = 80;
export const SPACING = 168;
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
  return TOP_PAD + BOTTOM_PAD + Math.max(0, count - 1) * SPACING;
}

/** Niveau 0 en bas, zigzag doux vers le haut. */
export function nodePosition(index: number, count: number, width: number): Point {
  const height = trackHeightFor(count);
  return {
    x: width / 2 + Math.sin(index * (Math.PI / 2)) * width * 0.28,
    y: height - BOTTOM_PAD - index * SPACING,
  };
}

export function worldIdAt(worldIndex: number): WorldId {
  return WORLD_ORDER[worldIndex % WORLD_ORDER.length] as WorldId;
}

export function worldIndexForLevel(levelIndex: number): number {
  return Math.floor(levelIndex / LEVELS_PER_WORLD);
}

/** Points de passage du chemin : il entre par le bas de l'écran et ressort par le haut. */
export function pathWaypoints(count: number, width: number): Point[] {
  if (count === 0) return [];
  const height = trackHeightFor(count);
  const nodes = Array.from({ length: count }, (_, i) => nodePosition(i, count, width));
  const first = nodes[0] as Point;
  return [{ x: first.x, y: height + 20 }, ...nodes, { x: width / 2, y: -20 }];
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

/** Échantillonne la courbe lisse (pour tenir le décor à distance du chemin). */
export function samplePath(points: Point[], stepsPerSegment = 12): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [a, b, c, d] = segmentAt(points, i);
    for (let s = 0; s < stepsPerSegment; s += 1) {
      const t = s / stepsPerSegment;
      const u = 1 - t;
      out.push({
        x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
        y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
      });
    }
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
    const firstLevel = w * LEVELS_PER_WORLD;
    const bottom = w === 0 ? height : height - BOTTOM_PAD - (firstLevel - 0.5) * SPACING;
    const top =
      w === worldCount - 1 ? 0 : height - BOTTOM_PAD - (firstLevel + LEVELS_PER_WORLD - 0.5) * SPACING;
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
