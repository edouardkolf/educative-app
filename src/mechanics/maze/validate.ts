// Validation de contenu (npm run validate:content) : messages en français.
import type { MazeParams } from '../../engine/types';
import { createRng } from '../../engine/rng';
import { generateRounds } from './generate';

const SEEDS = 30;

export function validateMaze(p: MazeParams): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(p.size) || p.size < 4 || p.size > 7) errors.push('maze : "size" (côté de la grille) doit être un entier de 4 à 7.');
  if (p.mode !== 'tap' && p.mode !== 'trace') errors.push('maze : "mode" doit valoir "tap" ou "trace".');
  if (!Number.isInteger(p.minPath) || p.minPath < p.size) errors.push('maze : "minPath" doit être un entier au moins égal à "size".');
  const maxPath = Math.floor(p.size * p.size * 0.6);
  if (p.minPath > maxPath) errors.push(`maze : "minPath" ne peut pas dépasser ${maxPath} sur une grille ${p.size}×${p.size}.`);

  if (errors.length === 0) {
    try {
      for (let seed = 1; seed <= SEEDS; seed += 1) generateRounds(p, 4, createRng(seed));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'maze : ces paramètres ne permettent pas de générer un labyrinthe.');
    }
  }
  return errors;
}
