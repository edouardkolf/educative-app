import type { HangmanParams, Rng, Round } from '../../engine/types';
import { HANGMAN_WORDS, HANGMAN_WORDS_BY_ID } from '../../games/hangman/words';
import type { HangmanWord } from '../../games/hangman/types';
import type { HangmanRoundData } from './types';

/** Mots de réserve voulus par manche (remplacent un mot perdu). */
export const RESERVE_PER_ROUND = 2;

/** Mots du catalogue retenus par `words` (ids inconnus ignorés), `minLength` et `maxLength`. */
export function filterPool(params: Pick<HangmanParams, 'words' | 'minLength' | 'maxLength'>): HangmanWord[] {
  const base = params.words
    ? params.words.flatMap((id) => HANGMAN_WORDS_BY_ID.get(id) ?? [])
    : [...HANGMAN_WORDS];
  const unique = [...new Map(base.map((w) => [w.id, w])).values()];
  return unique.filter(
    (w) =>
      (params.minLength === undefined || w.word.length >= params.minLength) &&
      (params.maxLength === undefined || w.word.length <= params.maxLength),
  );
}

/** Mot suivant après un mot perdu : on boucle sur la liste si la réserve est épuisée. */
export function nextWordIndex(index: number, total: number): number {
  return (index + 1) % total;
}

export function generateRounds(params: HangmanParams, count: number, rng: Rng): Round<HangmanRoundData>[] {
  const pool = filterPool(params);
  if (pool.length < count) {
    throw new Error(`hangman : ${pool.length} mot(s) disponible(s) pour ${count} manches.`);
  }
  // Tout le reste du filtre sert de réserve (au moins RESERVE_PER_ROUND quand c'est possible) : on ne revient
  // sur un mot déjà montré qu'après avoir perdu tous les autres mots de la manche.
  const perRound = Math.floor(pool.length / count);
  const drawn = rng.shuffle(pool).slice(0, count * perRound);
  return Array.from({ length: count }, (_, i) => {
    const words = drawn.slice(i * perRound, (i + 1) * perRound);
    return { data: { words, maxMistakes: params.maxMistakes }, answer: (words[0] as HangmanWord).id };
  });
}
