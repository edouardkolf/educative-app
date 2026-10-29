// Logique pure du labyrinthe : génération (parcours en profondeur), déplacements, chemin solution, règle du raté.
import type { Rng } from '../../engine/types';
import type { Cell, Maze } from './types';

export const MAX_STRIKES = 3;

const idx = (m: Maze, p: Cell) => p.r * m.size + p.c;
export const sameCell = (a: Cell, b: Cell) => a.r === b.r && a.c === b.c;
const inside = (m: Maze, p: Cell) => p.r >= 0 && p.c >= 0 && p.r < m.size && p.c < m.size;

/** Labyrinthe parfait : toutes les cases reliées, un seul chemin entre deux cases (size² − 1 passages). */
export function createMaze(size: number, rng: Rng): Maze {
  const maze: Maze = { size, right: new Array(size * size).fill(false), down: new Array(size * size).fill(false) };
  const seen = new Array<boolean>(size * size).fill(false);
  const first: Cell = { r: rng.int(0, size - 1), c: rng.int(0, size - 1) };
  seen[idx(maze, first)] = true;
  const stack: Cell[] = [first];
  while (stack.length > 0) {
    const cur = stack[stack.length - 1] as Cell;
    const free = [
      { r: cur.r - 1, c: cur.c },
      { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 },
      { r: cur.r, c: cur.c + 1 },
    ].filter((p) => inside(maze, p) && !seen[idx(maze, p)]);
    if (free.length === 0) {
      stack.pop();
      continue;
    }
    const next = rng.pick(free);
    openWall(maze, cur, next);
    seen[idx(maze, next)] = true;
    stack.push(next);
  }
  return maze;
}

function openWall(m: Maze, a: Cell, b: Cell): void {
  if (a.r === b.r) m.right[idx(m, a.c < b.c ? a : b)] = true;
  else m.down[idx(m, a.r < b.r ? a : b)] = true;
}

export const isNeighbor = (a: Cell, b: Cell) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

/** Vrai si b est voisine de a (côte à côte) et qu'aucun mur ne les sépare. */
export function canMove(m: Maze, a: Cell, b: Cell): boolean {
  if (!inside(m, a) || !inside(m, b) || !isNeighbor(a, b)) return false;
  return a.r === b.r ? m.right[idx(m, a.c < b.c ? a : b)] === true : m.down[idx(m, a.r < b.r ? a : b)] === true;
}

export function openNeighbors(m: Maze, p: Cell): Cell[] {
  return [
    { r: p.r - 1, c: p.c },
    { r: p.r + 1, c: p.c },
    { r: p.r, c: p.c - 1 },
    { r: p.r, c: p.c + 1 },
  ].filter((q) => canMove(m, p, q));
}

/** Distances (en pas) depuis une case ; -1 si inatteignable. */
export function distancesFrom(m: Maze, start: Cell): number[] {
  const dist = new Array<number>(m.size * m.size).fill(-1);
  dist[idx(m, start)] = 0;
  const queue: Cell[] = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i] as Cell;
    for (const n of openNeighbors(m, cur)) {
      if (dist[idx(m, n)] === -1) {
        dist[idx(m, n)] = (dist[idx(m, cur)] as number) + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

/** Chemin de la case de départ à l'arrivée, extrémités comprises ; null s'il n'existe pas. */
export function solutionPath(m: Maze, start: Cell, goal: Cell): Cell[] | null {
  const prev = new Map<number, Cell>();
  const seen = new Set<number>([idx(m, start)]);
  const queue: Cell[] = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i] as Cell;
    if (sameCell(cur, goal)) {
      const path: Cell[] = [cur];
      for (let p = prev.get(idx(m, cur)); p; p = prev.get(idx(m, p))) path.unshift(p);
      return path;
    }
    for (const n of openNeighbors(m, cur)) {
      if (!seen.has(idx(m, n))) {
        seen.add(idx(m, n));
        prev.set(idx(m, n), cur);
        queue.push(n);
      }
    }
  }
  return null;
}

/** Compteur de chocs (tap) ou de coupures (trace) : `emit` vaut vrai une seule fois, au 3e. */
export interface StrikeState {
  count: number;
  emit: boolean;
}

export function addStrike(count: number): StrikeState {
  return { count: count + 1, emit: count + 1 === MAX_STRIKES };
}

export type StepKind = 'same' | 'forward' | 'back' | 'blocked';

/**
 * Applique un déplacement vers `target` au trait (suite de cases, départ compris) : avancer d'une case sans mur,
 * reculer sur la case précédente (le trait se raccourcit), ou « blocked » (mur, case non voisine).
 */
export function stepTrail(m: Maze, trail: readonly Cell[], target: Cell): { kind: StepKind; trail: Cell[] } {
  const head = trail[trail.length - 1] as Cell;
  if (sameCell(head, target)) return { kind: 'same', trail: trail.slice() };
  const before = trail[trail.length - 2];
  if (before && sameCell(before, target)) return { kind: 'back', trail: trail.slice(0, -1) };
  if (canMove(m, head, target)) return { kind: 'forward', trail: [...trail, target] };
  return { kind: 'blocked', trail: trail.slice() };
}

/**
 * Comme `stepTrail`, mais tolère un virage coupé au doigt : si la case visée est en diagonale du bout du trait et
 * qu'une des deux cases de coin permet deux pas légaux (en avant ou en arrière), on passe par elle au lieu de compter
 * un choc (revue du 29/10 : le doigt traverse la zone neutre du coin).
 */
export function stepTrailLenient(m: Maze, trail: readonly Cell[], target: Cell): { kind: StepKind; trail: Cell[] } {
  const direct = stepTrail(m, trail, target);
  if (direct.kind !== 'blocked') return direct;
  const head = trail[trail.length - 1] as Cell;
  if (Math.abs(head.r - target.r) !== 1 || Math.abs(head.c - target.c) !== 1) return direct;
  for (const corner of [{ r: head.r, c: target.c }, { r: target.r, c: head.c }]) {
    const first = stepTrail(m, trail, corner);
    if (first.kind === 'blocked' || first.kind === 'same') continue;
    const second = stepTrail(m, first.trail, target);
    if (second.kind !== 'blocked' && second.kind !== 'same') return second;
  }
  return direct;
}
