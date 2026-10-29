// Génération des manches « maze » : le chemin solution fait toujours au moins `minPath` cases.
import type { MazeParams, Rng, Round } from '../../engine/types';
import { createMaze, distancesFrom } from './logic';
import type { Cell, Maze, MazeRoundData } from './types';

const MAZE_ATTEMPTS = 60;
const DISTINCT_ATTEMPTS = 30;

/** Couples animal → nourriture (tous présents dans public/emoji/). */
export const PAIRS: ReadonlyArray<{ animal: string; food: string }> = [
  { animal: '🐰', food: '🥕' },
  { animal: '🐝', food: '🌻' },
  { animal: '🐝', food: '🌸' },
  { animal: '🐵', food: '🍌' },
  { animal: '🐱', food: '🐟' },
  { animal: '🐷', food: '🍎' },
  { animal: '🐦', food: '🍒' },
  { animal: '🐌', food: '🍄' },
  { animal: '🐻', food: '🍇' },
  { animal: '🐴', food: '🍎' },
];

function allCells(size: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) cells.push({ r, c });
  return cells;
}

/** Départ et arrivée tels que le chemin compte au moins `minPath` cases : coins d'abord, puis toute la grille. */
function pickEnds(maze: Maze, minPath: number, rng: Rng): { start: Cell; goal: Cell } | null {
  const last = maze.size - 1;
  const corners: Cell[] = [{ r: 0, c: 0 }, { r: 0, c: last }, { r: last, c: 0 }, { r: last, c: last }];
  const cells = allCells(maze.size);
  for (const starts of [rng.shuffle(corners), rng.shuffle(cells)]) {
    for (const start of starts) {
      const dist = distancesFrom(maze, start);
      const goals = cells.filter((g) => (dist[g.r * maze.size + g.c] as number) + 1 >= minPath);
      if (goals.length > 0) return { start, goal: rng.pick(goals) };
    }
  }
  return null;
}

function signature(d: MazeRoundData): string {
  return `${d.maze.right.map(Number).join('')}|${d.maze.down.map(Number).join('')}|${d.start.r},${d.start.c}>${d.goal.r},${d.goal.c}`;
}

function makeRound(params: MazeParams, rng: Rng): MazeRoundData {
  for (let i = 0; i < MAZE_ATTEMPTS; i += 1) {
    const maze = createMaze(params.size, rng);
    const ends = pickEnds(maze, params.minPath, rng);
    if (ends) {
      const pair = rng.pick(PAIRS);
      return { maze, ...ends, mode: params.mode, animal: pair.animal, food: pair.food };
    }
  }
  throw new Error(`maze : impossible d'obtenir un chemin de ${params.minPath} cases sur une grille ${params.size}×${params.size}.`);
}

export function generateRounds(params: MazeParams, count: number, rng: Rng): Round<MazeRoundData>[] {
  const seen = new Set<string>();
  const rounds: Round<MazeRoundData>[] = [];
  for (let n = 0; n < count; n += 1) {
    let data = makeRound(params, rng);
    for (let t = 1; t < DISTINCT_ATTEMPTS && seen.has(signature(data)); t += 1) data = makeRound(params, rng);
    seen.add(signature(data));
    rounds.push({ data, answer: 'arrived' });
  }
  return rounds;
}
