// Validation de contenu (utilisée par `npm run validate:content`) : messages en français pour le parent.
import type { OrderParams } from '../../engine/types';
import { getObject } from '../../ui/objects';
import { MIN_SCALE, maxFeasibleGap } from './generate';

export function validateOrder(p: OrderParams): string[] {
  const errors: string[] = [];
  if (p.items < 3 || p.items > 5) errors.push('order : "items" doit être compris entre 3 et 5.');

  if (p.mode === 'size') {
    if (!p.objects || p.objects.length === 0) {
      errors.push('order : "objects" (objets possibles) est requis en mode "size".');
    } else {
      for (const id of p.objects) {
        if (!getObject(id)) errors.push(`order : l'objet "${id}" n'existe pas dans le catalogue.`);
      }
    }
    if (p.minGap === undefined) {
      errors.push('order : "minGap" (écart minimal entre deux tailles, en %) est requis en mode "size".');
    } else if (p.items >= 2 && p.items <= 5) {
      const max = maxFeasibleGap(p.items);
      if (p.minGap > max) {
        errors.push(
          `order : avec ${p.items} éléments, l'écart minimal ne peut pas dépasser ${max} % (tailles entre ${MIN_SCALE} % et 100 %).`,
        );
      }
      if (p.minGap < 1) errors.push('order : "minGap" doit être strictement positif.');
    }
  } else {
    if (!p.range) {
      errors.push('order : "range" (valeurs possibles) est requis en mode "quantity".');
    } else {
      const { min, max } = p.range;
      if (min < 1 || max > 9) errors.push('order : "range" doit rester entre 1 et 9 points.');
      if (min > max) errors.push('order : le minimum de "range" doit être inférieur ou égal au maximum.');
      else if (max - min + 1 < p.items) {
        errors.push(`order : "range" doit contenir au moins ${p.items} valeurs distinctes.`);
      }
    }
  }
  return errors;
}
