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
