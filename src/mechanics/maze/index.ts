// Mécanique « Labyrinthe » (MS) : amener l'animal à sa nourriture, en tapant ou en traçant (docs/specs/JEUX-MATERNELLE.md §3.3).
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { solutionPath } from './logic';
import { MazeView } from './MazeView';
import type { MazeRoundData } from './types';

export const maze: MechanicDefinition<'maze', MazeRoundData> = {
  id: 'maze',
  generateRounds,
  View: MazeView,
  solvedDelayMs: 1200,
  tutorialTargets(round) {
    const d = round.data;
    const path = solutionPath(d.maze, d.start, d.goal) ?? [];
    return path.slice(1, 4).map((p) => `cell-${p.r}-${p.c}`);
  },
};

export type { MazeRoundData } from './types';
export { validateMaze } from './validate';
