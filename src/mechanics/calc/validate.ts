// Validation de contenu (utilisée par `npm run validate:content`) : messages en français pour un PM non développeur.
import type { CalcParams } from '../../engine/types';
import { buildPool } from './generate';

const MAX_RESULT = 999;
const MAX_ARRAY_PRODUCT = 25;

export function validateParams(p: CalcParams): string[] {
  const errors: string[] = [];

  if (p.a.min > p.a.max) errors.push('calc : le minimum de "a" doit être inférieur ou égal au maximum.');
  if (p.b.min > p.b.max) errors.push('calc : le minimum de "b" doit être inférieur ou égal au maximum.');

  if (p.answer === 'choices' && !p.choices) {
    errors.push('calc : "choices" (nombre de propositions) est requis quand answer = "choices".');
  }

  if (p.a.min <= p.a.max && p.b.min <= p.b.max) {
    const pool = buildPool(p);
    if (pool.length === 0) {
      if (p.operation === 'sub' && p.a.max < p.b.min) {
        errors.push('calc : en soustraction, "a" doit pouvoir être supérieur ou égal à "b" (aucune paire valide).');
      } else {
        errors.push(
          'calc : aucune paire de nombres ne satisfait à la fois les bornes et la contrainte de retenue/emprunt.',
        );
      }
    } else {
      const maxResult = Math.max(
        ...pool.map(([a, b]) => (p.operation === 'add' ? a + b : p.operation === 'sub' ? a - b : a * b)),
      );
      if (maxResult > MAX_RESULT) {
        errors.push(`calc : le résultat peut dépasser ${MAX_RESULT} avec ces bornes.`);
      }
    }
  }

  if (p.showArray) {
    if (p.operation !== 'mul') {
      errors.push('calc : "showArray" (quadrillage de points) n\'a de sens qu\'en multiplication.');
    } else if (p.a.max * p.b.max > MAX_ARRAY_PRODUCT) {
      errors.push(`calc : "showArray" suppose un produit maximal de ${MAX_ARRAY_PRODUCT} au plus.`);
    }
  }

  return errors;
}
