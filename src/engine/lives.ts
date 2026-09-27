// Vies d'une partie : une vie perdue par manche ratée au premier coup (ARCHITECTURE.md §9).
// Taper au hasard finit toujours par trouver (les choix faux se grisent) : les vies y mettent une limite.
import { chanceOfFirstTry } from './chance';
import type { Level } from './types';

const MIN_LIVES = 2;
const MAX_LIVES = 4;
/** Part maximale de parties qu'un enfant tapant au hasard doit pouvoir terminer. */
const MAX_RANDOM_PASS_RATE = 0.25;

function binomial(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i += 1) result = (result * (n - i)) / (i + 1);
  return result;
}

/** Probabilité de rater au plus `maxMisses` manches sur `rounds`, chaque manche étant ratée avec la probabilité `missRate`. */
function atMostMisses(rounds: number, missRate: number, maxMisses: number): number {
  let sum = 0;
  for (let k = 0; k <= Math.min(maxMisses, rounds); k += 1) {
    sum += binomial(rounds, k) * missRate ** k * (1 - missRate) ** (rounds - k);
  }
  return sum;
}

/** Probabilité qu'un enfant tapant au hasard termine le niveau avec `lives` vies. */
export function randomPassRate(level: Level, lives: number): number {
  return atMostMisses(level.rounds, 1 - chanceOfFirstTry(level), lives - 1);
}

/**
 * Nombre de vies : le plus généreux (entre 2 et 4) qui laisse passer au plus 1 enfant sur 4 tapant au hasard.
 * Beaucoup de choix ou de manches → plus de vies ; 2 choix → 2 vies (le hasard y réussit trop souvent).
 * `level.lives` force la valeur.
 */
export function livesFor(level: Level): number {
  if (level.lives !== undefined) return level.lives;
  let lives = MIN_LIVES;
  for (let candidate = MIN_LIVES + 1; candidate <= MAX_LIVES; candidate += 1) {
    if (randomPassRate(level, candidate) <= MAX_RANDOM_PASS_RATE) lives = candidate;
  }
  return lives;
}
