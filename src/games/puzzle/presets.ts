// Difficultés des trois jeux libres de logique (docs/specs/JEUX-LOGIQUE.md §4) : un jeu de paramètres de la
// mécanique par palier (1, 2 ou 3 étoiles), contrôlé par le même validateur que les niveaux.
import type { CodeBreakerParams, GuessNumberParams, MazeParams, MemoryParams, OrderParams, RobotParams } from '../../engine/types';
import type { PuzzleGameId, PuzzlePreset } from '../../storage/puzzles';

export interface PuzzleParamsMap {
  'guess-number': GuessNumberParams;
  'code-breaker': CodeBreakerParams;
  robot: RobotParams;
  memory: MemoryParams;
  order: OrderParams;
  maze: MazeParams;
}

export const PUZZLE_PRESET_PARAMS: { [G in PuzzleGameId]: Record<PuzzlePreset, PuzzleParamsMap[G]> } = {
  'guess-number': {
    easy: { range: { min: 1, max: 20 }, maxGuesses: 5, input: 'tiles' },
    medium: { range: { min: 1, max: 100 }, maxGuesses: 8, input: 'keypad' },
    hard: { range: { min: 1, max: 999 }, maxGuesses: 11, input: 'keypad' },
  },
  'code-breaker': {
    easy: { length: 2, colors: ['red', 'blue', 'yellow'], repeats: false, feedback: 'positional', maxGuesses: 6 },
    medium: {
      length: 3,
      colors: ['red', 'blue', 'yellow', 'green'],
      repeats: false,
      feedback: 'positional',
      maxGuesses: 8,
    },
    hard: {
      length: 4,
      colors: ['red', 'blue', 'yellow', 'green', 'purple', 'orange'],
      repeats: true,
      feedback: 'counts',
      maxGuesses: 10,
    },
  },
  robot: {
    easy: { size: 4, obstacles: 2, mode: 'step', pathLength: { min: 2, max: 4 } },
    medium: { size: 5, obstacles: 5, mode: 'program', pathLength: { min: 4, max: 6 }, maxArrows: 8 },
    hard: { size: 6, obstacles: 8, mode: 'program', pathLength: { min: 6, max: 9 }, maxArrows: 12 },
  },
  // Memory (docs/specs/JEUX-MATERNELLE.md §4) : objets bien distincts à l'œil, essais ratés généreux.
  memory: {
    easy: {
      pairs: 3,
      objects: ['apple', 'dog', 'car', 'balloon', 'sunflower', 'fish'],
      maxMisses: 8,
      peekMs: 1500,
    },
    medium: {
      pairs: 6,
      objects: ['apple', 'banana', 'dog', 'fish', 'car', 'boat', 'ball', 'teddy', 'sunflower', 'butterfly'],
      maxMisses: 12,
    },
    hard: {
      pairs: 8,
      objects: [
        'apple', 'strawberry', 'dog', 'rabbit', 'fish', 'butterfly', 'car', 'boat', 'ball', 'teddy', 'sunflower', 'balloon',
      ],
      maxMisses: 16,
    },
  },
  // Ranger : tailles bien écartées, puis plus d'éléments, puis des quantités (points).
  order: {
    easy: { items: 3, mode: 'size', objects: ['apple', 'teddy', 'car', 'ball'], minGap: 30 },
    medium: { items: 4, mode: 'size', objects: ['apple', 'teddy', 'car', 'ball', 'cat'], minGap: 20 },
    hard: { items: 4, mode: 'quantity', range: { min: 1, max: 9 } },
  },
  // Labyrinthe : taper les cases, puis tracer au doigt, puis un plus grand (6 × 6 réservé au tracé, spec §3.3).
  maze: {
    easy: { size: 4, mode: 'tap', minPath: 6 },
    medium: { size: 5, mode: 'trace', minPath: 10 },
    hard: { size: 6, mode: 'trace', minPath: 14 },
  },
};
