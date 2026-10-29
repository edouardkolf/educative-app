// Validation de contenu (npm run validate:content) : messages en français pour un PM non développeur.
import type { MemoryParams } from '../../engine/types';
import { getObject } from '../../ui/objects';

export function validateMemory(p: MemoryParams): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(p.pairs) || p.pairs < 2 || p.pairs > 8) {
    errors.push('memory : "pairs" (nombre de paires) doit être un entier entre 2 et 8.');
  }
  const unknown = p.objects.filter((id) => !getObject(id));
  if (unknown.length > 0) errors.push(`memory : objets inconnus du catalogue : ${unknown.join(', ')}.`);
  const distinct = new Set(p.objects.filter((id) => getObject(id))).size;
  if (distinct < p.pairs) {
    errors.push(`memory : il faut au moins ${p.pairs} objets différents dans "objects" (il y en a ${distinct}).`);
  }
  if (!Number.isInteger(p.maxMisses) || p.maxMisses < 1) {
    errors.push('memory : "maxMisses" (essais ratés permis) doit être au moins 1.');
  }
  if (p.peekMs !== undefined && (p.peekMs < 0 || p.peekMs > 3000)) {
    errors.push('memory : "peekMs" (aperçu) doit être compris entre 0 et 3000 ms.');
  }
  return errors;
}
