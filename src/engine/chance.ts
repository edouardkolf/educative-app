// Probabilité de réussir une manche du premier coup en tapant au hasard, par niveau.
// Sert à lire un taux de réussite : 50 % sur un jeu à 2 choix, c'est le hasard ; sur un jeu à 4 choix, c'est deux fois mieux.
import type { Color, Level } from './types';

const PRIMARIES: readonly Color[] = ['red', 'blue', 'yellow'];

/**
 * Labo des couleurs : l'enfant verse 2 fioles parmi les 3 primaires (la même deux fois pour une primaire),
 * soit 9 suites de versements équiprobables. Une secondaire s'obtient de 2 façons, une primaire d'une seule.
 */
function colorMixChance(target: Color): number {
  return PRIMARIES.includes(target) ? 1 / 9 : 2 / 9;
}

/** Codes possibles : c^L avec répétitions, c! / (c − L)! sans. */
function codeCount(colorCount: number, length: number, repeats: boolean): number {
  let count = 1;
  for (let i = 0; i < length; i += 1) count *= repeats ? colorCount : colorCount - i;
  return Math.max(1, count);
}

const narrowingCache = new Map<string, number>();

/**
 * Devine le nombre en tuiles, au hasard parmi les nombres encore possibles : probabilité de trouver un secret
 * uniforme sur `n` nombres en `k` propositions au plus. Proposer g : trouvé (1/n), sinon le secret est d'un côté et il
 * reste g − 1 ou n − g nombres. f(n, k) = Σ_g 1/n · [1/n + (g−1)/n · f(g−1, k−1) + (n−g)/n · f(n−g, k−1)].
 */
export function randomNarrowingChance(n: number, k: number): number {
  if (n <= 0 || k <= 0) return 0;
  const key = `${n}:${k}`;
  const cached = narrowingCache.get(key);
  if (cached !== undefined) return cached;
  let sum = 0;
  for (let g = 1; g <= n; g += 1) {
    sum += (1 / n) * (1 / n + ((g - 1) / n) * randomNarrowingChance(g - 1, k - 1) + ((n - g) / n) * randomNarrowingChance(n - g, k - 1));
  }
  narrowingCache.set(key, sum);
  return sum;
}

export function chanceOfFirstTry(level: Level): number {
  switch (level.mechanic) {
    case 'sequence':
    case 'count':
      return 1 / level.params.choices;
    case 'odd-one-out':
      return 1 / level.params.items;
    case 'sort':
      return 1 / level.params.groups.length;
    case 'color-mix': {
      const { targets } = level.params;
      return targets.reduce((sum, t) => sum + colorMixChance(t), 0) / targets.length;
    }
    case 'compare':
      return 1 / 3;
    case 'calc':
      // Pavé numérique : deviner le nombre exact au hasard est négligeable.
      return level.params.answer === 'choices' ? 1 / (level.params.choices ?? 4) : 0;
    case 'spelling':
      return level.params.mode === 'tiles' ? 0 : 1 / (level.params.choices ?? 3);
    case 'read':
      return 1 / level.params.choices;
    case 'guess-number': {
      const { range, maxGuesses, input } = level.params;
      const size = range.max - range.min + 1;
      // Tuiles : les nombres éliminés se grisent, l'enfant qui tape au hasard pioche parmi ceux qui restent.
      // Pavé : rien ne se grise, un nombre tapé au hasard est tiré dans toute la plage.
      return input === 'tiles' ? randomNarrowingChance(size, maxGuesses) : 1 - (1 - 1 / size) ** maxGuesses;
    }
    case 'code-breaker': {
      const { length, colors, repeats, maxGuesses } = level.params;
      return 1 - (1 - 1 / codeCount(colors.length, length, repeats)) ** maxGuesses;
    }
    case 'order': {
      // Taper au hasard les éléments restants : tout dans l'ordre du premier coup avec la probabilité 1 / n!.
      let factorial = 1;
      for (let i = 2; i <= level.params.items; i += 1) factorial *= i;
      return 1 / factorial;
    }
    case 'memory':
    case 'maze':
    case 'robot':
    case 'tictactoe':
    case 'hangman':
      // Un choc, une grille perdue ou une fleur sans pétale arrivent bien avant un succès au hasard.
      return 0;
    case 'builder':
      // Poser toutes les pièces d'une figure sans une erreur, au hasard : quasi impossible.
      return 0;
    default:
      return 0;
  }
}

/**
 * Taux corrigé du hasard : 0 = pas mieux que taper au hasard, 1 = toujours juste du premier coup.
 * (taux − hasard) / (1 − hasard), borné à [0, 1].
 */
export function aboveChance(rate: number, chance: number): number {
  if (chance >= 1) return 1;
  return Math.max(0, Math.min(1, (rate - chance) / (1 - chance)));
}
