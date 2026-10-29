import type { TicTacToeParams } from '../../engine/types';

/** Données d'une manche : une graine pour le hasard du téléphone (manche reproductible) et les réglages. */
export interface TicTacToeRoundData {
  seed: number;
  /** Rang de la manche dans le niveau : avec childStarts « alternate », on alterne aussi d'une manche à l'autre. */
  roundIndex: number;
  level: TicTacToeParams['level'];
  hint: boolean;
  childStarts: TicTacToeParams['childStarts'];
}

export const TICTACTOE_WIN = 'win';
