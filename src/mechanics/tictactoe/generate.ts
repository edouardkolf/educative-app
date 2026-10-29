import type { Rng, Round, TicTacToeParams } from '../../engine/types';
import { TICTACTOE_WIN, type TicTacToeRoundData } from './types';

export function generateRounds(params: TicTacToeParams, count: number, rng: Rng): Round<TicTacToeRoundData>[] {
  return Array.from({ length: count }, (_, roundIndex) => ({
    data: {
      seed: rng.int(1, 0x7fffffff),
      roundIndex,
      level: params.level,
      hint: params.hint,
      childStarts: params.childStarts,
    },
    answer: TICTACTOE_WIN,
  }));
}
