// Difficultés des trois jeux libres de logique (docs/specs/JEUX-LOGIQUE.md §4) : un jeu de paramètres de la
// mécanique par palier (1, 2 ou 3 étoiles), contrôlé par le même validateur que les niveaux.
import type { CodeBreakerParams, GuessNumberParams, MemoryParams, RobotParams } from '../../engine/types';
import type { PuzzleGameId, PuzzlePreset } from '../../storage/puzzles';

export interface PuzzleParamsMap {
  'guess-number': GuessNumberParams;
  'code-breaker': CodeBreakerParams;
  robot: RobotParams;
  memory: MemoryParams;
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
};
