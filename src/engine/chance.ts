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
