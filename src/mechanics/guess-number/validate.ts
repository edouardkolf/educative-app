// Validation de contenu : messages en français pour le parent.
import type { GuessNumberParams } from '../../engine/types';

const MIN_NUMBERS = 5;
const MAX_TILES = 30;

export function validateGuessNumber(params: GuessNumberParams): string[] {
  const errors: string[] = [];
  const { min, max } = params.range;

  if (min >= max) {
    errors.push('guess-number : le minimum de la plage doit être strictement inférieur au maximum.');
    return errors;
  }
  const size = max - min + 1;
  if (size < MIN_NUMBERS) errors.push(`guess-number : la plage doit contenir au moins ${MIN_NUMBERS} nombres.`);
  if (params.input === 'tiles' && size > MAX_TILES) {
    errors.push(`guess-number : avec des tuiles, la plage ne peut pas dépasser ${MAX_TILES} nombres (ici ${size}).`);
  }
  const needed = Math.ceil(Math.log2(size));
  if (params.maxGuesses < needed) {
    errors.push(
      `guess-number : ${params.maxGuesses} propositions ne suffisent pas pour une plage de ${size} nombres ` +
        `(il en faut au moins ${needed} en jouant parfaitement).`,
    );
  }
  return errors;
}
