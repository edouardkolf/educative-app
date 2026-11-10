// Géométrie pure du coloriage (docs/specs/COLORIAGE.md §3.2, §4.2) : point dans une primitive,
// union de primitives, et résolution d'un tap sur le dessin. Aucun DOM, testable en isolation.
import type { Layer, Primitive } from './model';
import { HIT_RADIUS_PX } from './model';

/** Un point dans le repère 100×100 du dessin. */
export interface Point {
  x: number;
  y: number;
}

/** Le point est-il dans la primitive (bords inclus) ? */
export function pointInPrimitive(point: Point, shape: Primitive): boolean {
  switch (shape.kind) {
    case 'rect': {
      // Un rayon d'arrondi éventuel est ignoré : coin arrondi seulement esthétique, pas géométrique.
      return point.x >= shape.x && point.x <= shape.x + shape.w && point.y >= shape.y && point.y <= shape.y + shape.h;
    }
    case 'circle': {
      const dx = point.x - shape.cx;
      const dy = point.y - shape.cy;
      return dx * dx + dy * dy <= shape.r * shape.r;
    }
    case 'ellipse': {
      const dx = (point.x - shape.cx) / shape.rx;
      const dy = (point.y - shape.cy) / shape.ry;
      return dx * dx + dy * dy <= 1;
    }
    case 'polygon':
      return pointInPolygon(point, shape.points);
    case 'path':
      return flattenPath(shape.d).some((ring) => pointInPolygon(point, ring));
    default:
      return false;
  }
}

/** Point dans un polygone (ray casting, bords inclus via une petite tolérance). */
function pointInPolygon(point: Point, points: readonly [number, number][]): boolean {
  // D'abord, un point exactement sur une arête compte comme dedans (bords inclus).
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const [x1, y1] = points[i] as [number, number];
    const [x2, y2] = points[(i + 1) % n] as [number, number];
    if (pointOnSegment(point, x1, y1, x2, y2)) return true;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const [xi, yi] = points[i] as [number, number];
    const [xj, yj] = points[j] as [number, number];
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment(point: Point, x1: number, y1: number, x2: number, y2: number): boolean {
  const EPS = 1e-9;
  if (Math.abs(x2 - x1) < EPS && Math.abs(y2 - y1) < EPS) return Math.abs(point.x - x1) < EPS && Math.abs(point.y - y1) < EPS;
  const cross = (x2 - x1) * (point.y - y1) - (y2 - y1) * (point.x - x1);
  if (Math.abs(cross) > EPS) return false;
  const dot = (point.x - x1) * (x2 - x1) + (point.y - y1) * (y2 - y1);
  if (dot < -EPS) return false;
  const lenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  return dot <= lenSq + EPS;
}

/** Le point est-il dans l'union (au moins une des formes) ? */
export function pointInUnion(point: Point, shapes: readonly Primitive[]): boolean {
  return shapes.some((shape) => pointInPrimitive(point, shape));
}

/** Distance euclidienne entre deux points, dans le repère 100×100. */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface ZoneAnchor {
  id: string;
  anchor: Point;
}

/**
 * Résolution d'un tap (docs/specs/COLORIAGE.md §3.2) :
 *  1. parmi les cases non peintes, celle dont l'ancre est la plus proche du point, si elle est à
 *     moins de HIT_RADIUS_PX / pxPerUnit unités (disque tapable de 72 px, même sur une petite case) ;
 *  2. sinon, le calque le plus haut (dernier du tableau, l'encre exclue) qui contient le point :
 *     une case non peinte est renvoyée, un blanc/une case peinte/rien donne `null`.
 */
export function resolveTap(
  point: Point,
  layers: readonly Layer[],
  painted: ReadonlySet<string>,
  pxPerUnit: number,
): string | null {
  const hitRadiusUnits = HIT_RADIUS_PX / pxPerUnit;
  let nearest: { id: string; distance: number } | null = null;
  for (const layer of layers) {
    if (layer.kind !== 'zone' || painted.has(layer.id)) continue;
    const d = distance(point, layer.anchor);
    if (d > hitRadiusUnits) continue;
    if (!nearest || d < nearest.distance) nearest = { id: layer.id, distance: d };
  }
  if (nearest) return nearest.id;

  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i] as Layer;
    if (layer.kind === 'ink') continue; // transparent au tap, on regarde le calque du dessous
    if (!pointInUnion(point, layer.shape)) continue;
    if (layer.kind === 'zone' && !painted.has(layer.id)) return layer.id;
    return null; // blanc, case déjà peinte : rien
  }
  return null;
}

const FLATTEN_STEPS = 12;
const flattenCache = new Map<string, [number, number][][]>();

/**
 * Aplatit un chemin SVG fermé en polygones (un par sous-chemin) : commandes M L H V C S Q T Z,
 * absolues ou relatives. Les courbes sont découpées en FLATTEN_STEPS segments, ce qui suffit à
 * l'échelle du repère 100×100. Un arc (A) est refusé : le dessiner en courbes de Bézier.
 */
export function flattenPath(d: string): [number, number][][] {
  const cached = flattenCache.get(d);
  if (cached) return cached;
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const rings: [number, number][][] = [];
  let ring: [number, number][] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let ctrlX = 0; // dernier point de contrôle, pour S et T
  let ctrlY = 0;
  let previous = '';
  let index = 0;
  let command = '';
  const next = (): number => {
    const token = tokens[index];
    index += 1;
    const value = Number(token);
    if (token === undefined || Number.isNaN(value)) throw new Error(`chemin invalide : ${d}`);
    return value;
  };
  const closeRing = () => {
    // Sans points répétés (un Z après un retour au départ en donne un) : une arête de longueur
    // nulle n'a pas de sens pour le test « point sur une arête ».
    const clean = ring.filter((point, i) => {
      const before = ring[(i + ring.length - 1) % ring.length] as [number, number];
      return Math.abs(point[0] - before[0]) > 1e-9 || Math.abs(point[1] - before[1]) > 1e-9;
    });
    if (clean.length >= 3) rings.push(clean);
    ring = [];
  };
  const curve = (points: [number, number][]) => {
    // Bézier quadratique (3 points) ou cubique (4 points), depuis le point courant.
    for (let step = 1; step <= FLATTEN_STEPS; step += 1) {
      const t = step / FLATTEN_STEPS;
      const u = 1 - t;
      if (points.length === 3) {
        const [p0, p1, p2] = points as [[number, number], [number, number], [number, number]];
        ring.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
      } else {
        const [p0, p1, p2, p3] = points as [[number, number], [number, number], [number, number], [number, number]];
        ring.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
    }
  };
  while (index < tokens.length) {
    const token = tokens[index] as string;
    if (/[a-zA-Z]/.test(token)) {
      command = token;
      index += 1;
    } else if (command === 'M') {
      command = 'L'; // des coordonnées après un M sont des L implicites
    } else if (command === 'm') {
      command = 'l';
    } else if (command === '' || command === 'Z' || command === 'z') {
      throw new Error(`chemin invalide : ${d}`);
    }
    const relative = command === command.toLowerCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;
    switch (command.toUpperCase()) {
      case 'M':
        closeRing();
        x = ox + next();
        y = oy + next();
        startX = x;
        startY = y;
        ring.push([x, y]);
        break;
      case 'L':
        x = ox + next();
        y = oy + next();
        ring.push([x, y]);
        break;
      case 'H':
        x = ox + next();
        ring.push([x, y]);
        break;
      case 'V':
        y = oy + next();
        ring.push([x, y]);
        break;
      case 'C': {
        const c1: [number, number] = [ox + next(), oy + next()];
        const c2: [number, number] = [ox + next(), oy + next()];
        const end: [number, number] = [ox + next(), oy + next()];
        curve([[x, y], c1, c2, end]);
        [ctrlX, ctrlY] = c2;
        [x, y] = end;
        break;
      }
      case 'S': {
        const smooth = previous === 'C' || previous === 'S';
        const c1: [number, number] = smooth ? [2 * x - ctrlX, 2 * y - ctrlY] : [x, y];
        const c2: [number, number] = [ox + next(), oy + next()];
        const end: [number, number] = [ox + next(), oy + next()];
        curve([[x, y], c1, c2, end]);
        [ctrlX, ctrlY] = c2;
        [x, y] = end;
        break;
      }
      case 'Q': {
        const c: [number, number] = [ox + next(), oy + next()];
        const end: [number, number] = [ox + next(), oy + next()];
        curve([[x, y], c, end]);
        [ctrlX, ctrlY] = c;
        [x, y] = end;
        break;
      }
      case 'T': {
        const smooth = previous === 'Q' || previous === 'T';
        const c: [number, number] = smooth ? [2 * x - ctrlX, 2 * y - ctrlY] : [x, y];
        const end: [number, number] = [ox + next(), oy + next()];
        curve([[x, y], c, end]);
        [ctrlX, ctrlY] = c;
        [x, y] = end;
        break;
      }
      case 'Z':
        x = startX;
        y = startY;
        closeRing();
        break;
      default:
        throw new Error(`commande « ${command} » non prise en charge dans un chemin : ${d}`);
    }
    previous = command.toUpperCase();
  }
  closeRing();
  flattenCache.set(d, rings);
  return rings;
}
