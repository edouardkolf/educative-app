import type { GuessNumberParams, Rng, Round } from '../../engine/types';
import type { GuessNumberRoundData } from './types';

export function generateRounds(params: GuessNumberParams, count: number, rng: Rng): Round<GuessNumberRoundData>[] {
  const { min, max } = params.range;
  const size = max - min + 1;
  const secrets: number[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i += 1) {
    // Distincts tant que la plage le permet ; ensuite on repart de zéro en évitant de répéter la manche précédente.
    if (used.size >= size) used.clear();
    let secret = rng.int(min, max);
    while (used.has(secret) || (size > 1 && secret === secrets[i - 1])) secret = rng.int(min, max);
    used.add(secret);
    secrets.push(secret);
  }

  return secrets.map((secret) => ({
    answer: String(secret),
    data: { secret, min, max, maxGuesses: params.maxGuesses, input: params.input },
  }));
}
