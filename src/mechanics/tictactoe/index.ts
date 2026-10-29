// Mécanique « morpion » : gagner une grille contre le téléphone (docs/specs/JEUX-LOGIQUE.md §3.4).
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { TicTacToeView } from './TicTacToeView';
import type { TicTacToeRoundData } from './types';

export const tictactoe: MechanicDefinition<'tictactoe', TicTacToeRoundData> = {
  id: 'tictactoe',
  generateRounds,
  View: TicTacToeView,
  solvedDelayMs: 1200,
  tutorialTargets: () => ['cell-4'],
};

export type { TicTacToeRoundData } from './types';
export { validateTicTacToe } from './validate';
