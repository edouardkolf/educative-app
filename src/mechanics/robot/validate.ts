// Validation de contenu (npm run validate:content) : messages en français.
import type { RobotParams } from '../../engine/types';
import { createRng } from '../../engine/rng';
import { generateRounds } from './generate';

const SEEDS = 30;

export function validateRobot(p: RobotParams): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(p.size) || p.size < 4 || p.size > 6) errors.push('robot : "size" (côté de la grille) doit être un entier de 4 à 6.');
  if (p.obstacles < 0 || p.obstacles > 10) errors.push('robot : "obstacles" doit être compris entre 0 et 10.');
  if (p.pathLength.min > p.pathLength.max) errors.push('robot : le minimum de "pathLength" doit être inférieur ou égal au maximum.');
  if (p.pathLength.min < 2) errors.push('robot : "pathLength.min" doit valoir au moins 2.');
  if (p.pathLength.max > 2 * (p.size - 1) + 4) {
    errors.push(`robot : "pathLength.max" ne peut pas dépasser ${2 * (p.size - 1) + 4} sur une grille ${p.size}×${p.size}.`);
  }
  if (p.obstacles > (p.size * p.size) / 3) {
    errors.push(`robot : trop de rochers (${p.obstacles}) pour une grille ${p.size}×${p.size} (maximum ${Math.floor((p.size * p.size) / 3)}).`);
  }
  if (p.mode === 'program') {
    if (p.maxArrows === undefined) errors.push('robot : "maxArrows" est requis en mode "program".');
    else if (p.maxArrows < p.pathLength.max) errors.push('robot : "maxArrows" doit être au moins égal à "pathLength.max".');
  } else if (p.maxArrows !== undefined) {
    errors.push('robot : "maxArrows" n\'a de sens qu\'en mode "program".');
  }

  if (errors.length === 0) {
    try {
      for (let seed = 1; seed <= SEEDS; seed += 1) generateRounds(p, 4, createRng(seed));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'robot : ces paramètres ne permettent pas de générer une grille.');
    }
  }
  return errors;
}
