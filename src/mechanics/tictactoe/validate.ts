import type { TicTacToeParams } from '../../engine/types';

const LEVELS = ['easy', 'medium', 'hard'];
const STARTS = ['always', 'alternate'];

/** Le schéma JSON couvre déjà les types ; on vérifie les valeurs énumérées au cas où. */
export function validateTicTacToe(params: TicTacToeParams): string[] {
  const errors: string[] = [];
  if (!LEVELS.includes(params.level)) errors.push('tictactoe : "level" doit valoir easy, medium ou hard.');
  if (!STARTS.includes(params.childStarts)) errors.push('tictactoe : "childStarts" doit valoir always ou alternate.');
  return errors;
}
