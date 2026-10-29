// Génération des manches « memory » : `pairs` objets distincts tirés du réservoir, doublés puis mélangés.
import type { MemoryParams, Rng, Round } from '../../engine/types';
import type { MemoryRoundData } from './types';

const DISTINCT_ATTEMPTS = 30;

export function generateRounds(params: MemoryParams, count: number, rng: Rng): Round<MemoryRoundData>[] {
  const pool = [...new Set(params.objects)];
  const seen = new Set<string>();
  const rounds: Round<MemoryRoundData>[] = [];
  for (let n = 0; n < count; n += 1) {
    let cards: string[] = [];
    for (let t = 0; t < DISTINCT_ATTEMPTS; t += 1) {
      const chosen = rng.shuffle(pool).slice(0, params.pairs);
      cards = rng.shuffle(chosen.flatMap((id) => [id, id]));
      if (!seen.has(cards.join())) break;
    }
    seen.add(cards.join());
    rounds.push({
      data: { cards, maxMisses: params.maxMisses, peekMs: params.peekMs ?? 0 },
      answer: 'cleared',
    });
  }
  return rounds;
}
