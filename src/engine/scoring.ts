// Score d'une partie : manches ratées puis étoiles (ARCHITECTURE.md §7).
import type { RoundRecord } from '../storage/types';
import type { Level } from './types';

const DEFAULT_MAX_MISSES_FOR_3 = 0;
const DEFAULT_MAX_MISSES_FOR_2 = 1;

/** Manches non réussies du premier coup. */
export function countMisses(rounds: RoundRecord[]): number {
  return rounds.filter((round) => !round.firstTry).length;
}

/** Terminer un niveau rapporte toujours au moins 1 étoile (jamais punitif). */
export function computeStars(level: Level, misses: number): 1 | 2 | 3 {
  const maxMissesFor3 = level.stars?.maxMissesFor3 ?? DEFAULT_MAX_MISSES_FOR_3;
  const maxMissesFor2 = level.stars?.maxMissesFor2 ?? DEFAULT_MAX_MISSES_FOR_2;
  if (misses <= maxMissesFor3) return 3;
  if (misses <= maxMissesFor2) return 2;
  return 1;
}
