// Validation des paramètres du niveau « comparer », pour un parent non développeur.
import type { CompareParams } from '../../engine/types';

export function validateParams(p: CompareParams): string[] {
  const errors: string[] = [];

  if (p.min > p.max) {
    errors.push('Le minimum doit être inférieur ou égal au maximum.');
  }

  if (p.form !== 'numbers' && p.min < 2) {
    errors.push("Avec une somme de deux nombres (chacun d'au moins 1), le minimum doit être au moins 2.");
  }

  if (p.min <= p.max && p.min === p.max) {
    errors.push('La plage min–max doit permettre au moins deux valeurs différentes.');
  }

  if (p.equalRate < 0 || p.equalRate > 0.5) {
    errors.push('La part de manches égales (equalRate) doit être comprise entre 0 et 0,5.');
  }

  if (p.maxGap !== undefined && p.maxGap < 1) {
    errors.push("L'écart maximal (maxGap) doit être au moins 1.");
  }

  return errors;
}
