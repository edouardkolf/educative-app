// Outils de géométrie de la mer : contour d'une forme définie par un champ (marching squares), lissage,
// test d'appartenance. Purs et déterministes.
import type { Point } from '../../layout';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Grid {
  x0: number;
  y0: number;
  step: number;
  nx: number;
  ny: number;
  values: Float64Array;
}

/** Valeurs du champ `f` aux nœuds d'une grille de pas `step` couvrant `box`. */
export function sampleGrid(f: (x: number, y: number) => number, box: Box, step: number): Grid {
  const nx = Math.ceil((box.x1 - box.x0) / step) + 1;
  const ny = Math.ceil((box.y1 - box.y0) / step) + 1;
  const values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) values[j * nx + i] = f(box.x0 + i * step, box.y0 + j * step);
  }
  return { x0: box.x0, y0: box.y0, step, nx, ny, values };
}

/**
 * Courbes de niveau `level` du champ (marching squares) : boucles fermées autour des zones où le champ
 * dépasse `level`. La grille doit être bordée de valeurs sous `level` pour que tout se referme.
 */
export function contours(grid: Grid, level: number): Point[][] {
  const { nx, ny, values, x0, y0, step } = grid;
  const v = (i: number, j: number) => values[j * nx + i] as number;
  const points = new Map<string, Point>();
  const links = new Map<string, string[]>();
  const cross = (id: string, ax: number, ay: number, bx: number, by: number) => {
    if (!points.has(id)) {
      const va = v(ax, ay);
      const vb = v(bx, by);
      const t = vb === va ? 0.5 : (level - va) / (vb - va);
      points.set(id, { x: x0 + (ax + (bx - ax) * t) * step, y: y0 + (ay + (by - ay) * t) * step });
    }
    return id;
  };
  const link = (a: string, b: string) => {
    links.set(a, [...(links.get(a) ?? []), b]);
    links.set(b, [...(links.get(b) ?? []), a]);
  };
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const a = v(i, j) > level; // haut gauche
      const b = v(i + 1, j) > level; // haut droit
      const c = v(i + 1, j + 1) > level; // bas droit
      const d = v(i, j + 1) > level; // bas gauche
      const T = () => cross(`h${i},${j}`, i, j, i + 1, j);
      const R = () => cross(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1);
      const B = () => cross(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1);
      const L = () => cross(`v${i},${j}`, i, j, i, j + 1);
      const edges: Array<() => string> = [];
      if (a !== b) edges.push(T);
      if (b !== c) edges.push(R);
      if (c !== d) edges.push(B);
      if (d !== a) edges.push(L);
      if (edges.length === 2) {
        link(edges[0]!(), edges[1]!());
      } else if (edges.length === 4) {
        // Point col : le centre de la case décide quels coins sont reliés.
        const center = (v(i, j) + v(i + 1, j) + v(i + 1, j + 1) + v(i, j + 1)) / 4 > level;
        if (a === center) {
          link(T(), R());
          link(B(), L());
        } else {
          link(T(), L());
          link(R(), B());
        }
      }
    }
  }
  const seen = new Set<string>();
  const loops: Point[][] = [];
  for (const start of [...links.keys()].sort()) {
    if (seen.has(start)) continue;
    const loop: Point[] = [];
    let prev = '';
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(points.get(cur)!);
      const next = (links.get(cur) ?? []).find((n) => n !== prev && !seen.has(n));
      if (!next) break;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

export function polygonArea(loop: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Le point est-il dans le polygone (règle pair-impair) ? */
export function insidePolygon(loop: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
    const a = loop[i]!;
    const b = loop[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Points d'une boucle fermée répartis tous les `step` px environ. */
export function resampleLoop(loop: readonly Point[], step: number): Point[] {
  const out: Point[] = [];
  let carry = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    let d = carry;
    for (; d < len; d += step) out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
    carry = d - len;
  }
  return out;
}

/** Lissage de Chaikin d'une boucle fermée (coins arrondis). */
export function chaikin(loop: readonly Point[], rounds = 1): Point[] {
  let cur = loop.slice();
  for (let r = 0; r < rounds; r += 1) {
    const next: Point[] = [];
    for (let i = 0; i < cur.length; i += 1) {
      const a = cur[i]!;
      const b = cur[(i + 1) % cur.length]!;
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    cur = next;
  }
  return cur;
}

/** Boucle arrondie au dixième de pixel (données légères et stables). */
export function roundLoop(loop: readonly Point[]): Point[] {
  return loop.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
}

/** Attribut `d` d'une boucle fermée, en courbes qui passent par le milieu de chaque côté. */
export function loopD(loop: readonly Point[]): string {
  const n = loop.length;
  if (n < 3) return '';
  const r = (k: number) => Math.round(k * 10) / 10;
  const mid = (i: number) => {
    const a = loop[i % n]!;
    const b = loop[(i + 1) % n]!;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const m0 = mid(0);
  let d = `M${r(m0.x)} ${r(m0.y)}`;
  for (let i = 1; i <= n; i += 1) {
    const p = loop[i % n]!;
    const m = mid(i);
    d += `Q${r(p.x)} ${r(p.y)} ${r(m.x)} ${r(m.y)}`;
  }
  return `${d}Z`;
}

/** Union lisse de disques : > 0 dedans, ≈ distance signée au bord. */
export function smoothDisks(disks: readonly { x: number; y: number; r: number }[], k: number) {
  return (x: number, y: number): number => {
    let best = -Infinity;
    for (const c of disks) best = Math.max(best, c.r - Math.hypot(x - c.x, y - c.y));
    if (best === -Infinity) return best;
    let sum = 0;
    for (const c of disks) {
      const e = c.r - Math.hypot(x - c.x, y - c.y) - best;
      if (e > -6 * k) sum += Math.exp(e / k);
    }
    return best + k * Math.log(sum);
  };
}

/** Distance du point au plus proche des points donnés. */
export function nearest(points: readonly Point[], x: number, y: number): number {
  let best = Infinity;
  for (const p of points) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
