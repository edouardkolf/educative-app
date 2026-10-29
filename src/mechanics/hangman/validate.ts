import type { HangmanParams } from '../../engine/types';
import { HANGMAN_WORDS_BY_ID } from '../../games/hangman/words';
import { filterPool } from './generate';

/** Au moins 3 mots par manche possibles pour 3 manches. */
const MIN_POOL = 9;

export function validateHangman(params: HangmanParams): string[] {
  const errors: string[] = [];
  const unknown = (params.words ?? []).filter((id) => !HANGMAN_WORDS_BY_ID.has(id));
  if (unknown.length > 0) errors.push(`hangman : mots inconnus du catalogue : ${unknown.join(', ')}.`);
  if (params.minLength !== undefined && params.maxLength !== undefined && params.minLength > params.maxLength) {
    errors.push('hangman : "minLength" doit être inférieur ou égal à "maxLength".');
  }
  if (!Number.isInteger(params.maxMistakes) || params.maxMistakes < 4 || params.maxMistakes > 10) {
    errors.push('hangman : "maxMistakes" doit être un entier de 4 à 10.');
  }
  if (errors.length === 0) {
    const pool = filterPool(params).length;
    if (pool < MIN_POOL) {
      errors.push(`hangman : seulement ${pool} mot(s) possible(s) après filtrage ; il en faut au moins ${MIN_POOL} (3 mots par manche).`);
    }
  }
  return errors;
}
