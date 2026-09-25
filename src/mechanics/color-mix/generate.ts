// Génération pure des manches de « color-mix » (laboratoire des couleurs). Aucun DOM, aucun stockage.
import type { Color, ColorMixParams, Rng, Round } from '../../engine/types';
import type { ColorMixRoundData } from './types';

/** Les trois fioles disponibles à l'écran (tapables deux fois pour une cible primaire). */
export const PRIMARY_FLASKS: readonly Color[] = ['red', 'yellow', 'blue'];

/**
 * Résultat du mélange de deux couleurs primaires versées dans le chaudron, indépendant de l'ordre.
 * Une même couleur versée deux fois donne... la même couleur (mais un objet révélé différent, voir
 * `OBJECT_FOR_COLOR` dans ColorMixView).
 */
export function mixColors(a: Color, b: Color): Color {
  if (a === b) return a;
  const pair = [a, b].sort().join('+');
  switch (pair) {
    case 'red+yellow':
      return 'orange';
    case 'blue+red':
      return 'purple';
    case 'blue+yellow':
      return 'green';
    default:
      // Ne devrait pas arriver (seules les fioles primaires sont versées) : repli sans planter.
      return a;
  }
}

/**
 * Les deux fioles à verser pour obtenir `target` (utilisé par la main du tutoriel). Une cible
 * primaire (red/yellow/blue) se réalise en versant deux fois la même fiole.
 */
export function recipeFor(target: Color): [Color, Color] {
  switch (target) {
    case 'orange':
      return ['red', 'yellow'];
    case 'purple':
      return ['red', 'blue'];
    case 'green':
      return ['blue', 'yellow'];
    case 'red':
      return ['red', 'red'];
    case 'yellow':
      return ['yellow', 'yellow'];
    case 'blue':
      return ['blue', 'blue'];
    default:
      // Cible non prévue (ne devrait pas arriver, validé par content.test.ts) : repli inoffensif.
      return ['red', 'red'];
  }
}

/**
 * Séquence de `count` cibles : consomme des paquets mélangés de `targets` un par un (donc les
 * `targets.length` premières cibles couvrent tout le réservoir), en évitant si possible de répéter
 * la cible précédente d'une manche à l'autre.
 */
function buildTargetSequence(targets: readonly Color[], count: number, rng: Rng): Color[] {
  const sequence: Color[] = [];
  let previous: Color | null = null;
  let queue: Color[] = [];

  while (sequence.length < count) {
    if (queue.length === 0) queue = rng.shuffle(targets);
    let index = queue.findIndex((c) => c !== previous);
    if (index === -1) index = 0; // un seul target possible : on ne peut pas éviter la répétition
    const [chosen] = queue.splice(index, 1) as [Color];
    sequence.push(chosen);
    previous = chosen;
  }
  return sequence;
}

export function generateRounds(params: ColorMixParams, count: number, rng: Rng): Round<ColorMixRoundData>[] {
  const targets = buildTargetSequence(params.targets, count, rng);
  return targets.map((target) => ({ data: { target }, answer: target }));
}
