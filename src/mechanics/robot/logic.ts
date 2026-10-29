// Logique pure du robot : déplacements absolus sur une grille avec rochers.
import type { Dir, Grid, Pos } from './types';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export const DELTA: Record<Dir, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isRock(grid: Grid, pos: Pos): boolean {
  return grid.rocks.some((r) => samePos(r, pos));
}

/** Nouvelle position après un pas, ou null si le pas sort de la grille ou heurte un rocher. */
export function move(grid: Grid, pos: Pos, dir: Dir): Pos | null {
  const d = DELTA[dir];
  const next = { x: pos.x + d.x, y: pos.y + d.y };
  if (next.x < 0 || next.y < 0 || next.x >= grid.size || next.y >= grid.size) return null;
  if (isRock(grid, next)) return null;
  return next;
}

/** Plus court chemin (BFS) sous forme de flèches ; [] si start = goal ; null si inatteignable. */
export function shortestPath(grid: Grid, start: Pos, goal: Pos): Dir[] | null {
  const key = (p: Pos) => p.y * grid.size + p.x;
  const from = new Map<number, { prev: Pos; dir: Dir }>();
  const seen = new Set<number>([key(start)]);
  const queue: Pos[] = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i] as Pos;
    if (samePos(cur, goal)) break;
    for (const dir of DIRS) {
      const next = move(grid, cur, dir);
      if (!next || seen.has(key(next))) continue;
      seen.add(key(next));
      from.set(key(next), { prev: cur, dir });
      queue.push(next);
    }
  }
  if (!seen.has(key(goal))) return null;
  const path: Dir[] = [];
  let cur = goal;
  while (!samePos(cur, start)) {
    const step = from.get(key(cur)) as { prev: Pos; dir: Dir };
    path.push(step.dir);
    cur = step.prev;
  }
  return path.reverse();
}

export interface RunResult {
  /** Positions successives : trace[0] = départ, trace[i + 1] = position après la flèche i. */
  trace: Pos[];
  /** 'goal' : fini sur le trésor ; 'blocked' : choc ; 'stopped' : programme fini ailleurs que sur le trésor. */
  outcome: 'goal' | 'blocked' | 'stopped';
  /** Indice de la flèche qui a heurté quelque chose (outcome 'blocked'). */
  blockedAt: number | null;
}

/** Exécute le programme ; passer sur le trésor en cours de route ne compte pas. */
export function runProgram(grid: Grid, start: Pos, goal: Pos, program: readonly Dir[]): RunResult {
  const trace: Pos[] = [start];
  let pos = start;
  for (let k = 0; k < program.length; k += 1) {
    const next = move(grid, pos, program[k] as Dir);
    if (!next) return { trace, outcome: 'blocked', blockedAt: k };
    pos = next;
    trace.push(pos);
  }
  return { trace, outcome: samePos(pos, goal) ? 'goal' : 'stopped', blockedAt: null };
}
