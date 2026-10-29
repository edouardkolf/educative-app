// Génération des manches « robot » : le plus court chemin tombe toujours dans `pathLength`.
import type { Rng, RobotParams, Round } from '../../engine/types';
import { shortestPath } from './logic';
import type { Pos, RobotRoundData } from './types';

const RANDOM_ATTEMPTS = 800;
const DISTINCT_ATTEMPTS = 40;

const manhattan = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function allCells(size: number): Pos[] {
  const cells: Pos[] = [];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) cells.push({ x, y });
  return cells;
}

function signature(d: RobotRoundData): string {
  const rocks = d.rocks.map((r) => `${r.x},${r.y}`).sort().join(';');
  return `${d.start.x},${d.start.y}>${d.goal.x},${d.goal.y}|${rocks}`;
}

function makeData(params: RobotParams, start: Pos, goal: Pos, rocks: Pos[], minMoves: number): RobotRoundData {
  return {
    size: params.size,
    start,
    goal,
    rocks,
    mode: params.mode,
    minMoves,
    maxArrows: params.maxArrows ?? 0,
  };
}

/** Tirages aléatoires : départ, trésor et rochers ; on garde si le plus court chemin est dans la plage. */
function randomLayout(params: RobotParams, rng: Rng): RobotRoundData | null {
  const cells = allCells(params.size);
  const { min, max } = params.pathLength;
  for (let i = 0; i < RANDOM_ATTEMPTS; i += 1) {
    const start = rng.pick(cells);
    const goal = rng.pick(cells);
    const dist = manhattan(start, goal);
    if (dist === 0 || dist > max) continue;
    const free = cells.filter((c) => manhattan(c, start) > 0 && manhattan(c, goal) > 0);
    const rocks = rng.shuffle(free).slice(0, params.obstacles);
    const path = shortestPath({ size: params.size, rocks }, start, goal);
    if (path && path.length >= min && path.length <= max) {
      return makeData(params, start, goal, rocks, path.length);
    }
  }
  return null;
}

/**
 * Repli : on choisit d'abord un trajet en L de longueur d dans la plage, puis on pose les rochers hors de ce trajet.
 * Le plus court chemin vaut alors exactement d (la distance de Manhattan est un minorant).
 */
function guaranteedLayout(params: RobotParams, rng: Rng): RobotRoundData {
  const { size, obstacles, pathLength } = params;
  const cells = allCells(size);
  const lengths = rng
    .shuffle(Array.from({ length: pathLength.max - pathLength.min + 1 }, (_, i) => pathLength.min + i))
    .filter((d) => d <= 2 * (size - 1) && size * size - (d + 1) >= obstacles);
  for (const d of lengths) {
    const pairs: Array<[Pos, Pos]> = [];
    for (const s of cells) for (const g of cells) if (manhattan(s, g) === d) pairs.push([s, g]);
    if (pairs.length === 0) continue;
    const [start, goal] = rng.pick(pairs);
    const horizontalFirst = rng.next() < 0.5;
    const onPath = new Set<string>();
    const stepX = Math.sign(goal.x - start.x);
    const stepY = Math.sign(goal.y - start.y);
    const corner: Pos = horizontalFirst ? { x: goal.x, y: start.y } : { x: start.x, y: goal.y };
    for (let p = { ...start }; ; ) {
      onPath.add(`${p.x},${p.y}`);
      if (p.x === corner.x && p.y === corner.y) break;
      p = horizontalFirst ? { x: p.x + stepX, y: p.y } : { x: p.x, y: p.y + stepY };
    }
    for (let p = { ...corner }; ; ) {
      onPath.add(`${p.x},${p.y}`);
      if (p.x === goal.x && p.y === goal.y) break;
      p = horizontalFirst ? { x: p.x, y: p.y + stepY } : { x: p.x + stepX, y: p.y };
    }
    const free = cells.filter((c) => !onPath.has(`${c.x},${c.y}`));
    return makeData(params, start, goal, rng.shuffle(free).slice(0, obstacles), d);
  }
  throw new Error(
    `robot : impossible de poser un trajet de ${pathLength.min} à ${pathLength.max} pas avec ${obstacles} rochers sur une grille ${size}×${size}.`,
  );
}

export function generateRounds(params: RobotParams, count: number, rng: Rng): Round<RobotRoundData>[] {
  const seen = new Set<string>();
  const rounds: Round<RobotRoundData>[] = [];
  for (let n = 0; n < count; n += 1) {
    let data: RobotRoundData | null = null;
    for (let t = 0; t < DISTINCT_ATTEMPTS; t += 1) {
      const candidate = (t < DISTINCT_ATTEMPTS / 2 ? randomLayout(params, rng) : null) ?? guaranteedLayout(params, rng);
      data = candidate;
      if (!seen.has(signature(candidate))) break;
    }
    const chosen = data as RobotRoundData;
    seen.add(signature(chosen));
    rounds.push({ data: chosen, answer: 'goal' });
  }
  return rounds;
}
