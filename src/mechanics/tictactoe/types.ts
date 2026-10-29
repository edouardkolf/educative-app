import type { TicTacToeParams } from '../../engine/types';

/** Données d'une manche : une graine pour le hasard du téléphone (manche reproductible) et les réglages. */
export interface TicTacToeRoundData {
  seed: number;
  level: TicTacToeParams['level'];
  hint: boolean;
  childStarts: TicTacToeParams['childStarts'];
}

export const TICTACTOE_WIN = 'win';
