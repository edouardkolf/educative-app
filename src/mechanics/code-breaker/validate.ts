// Validation de contenu (npm run validate:content) : messages en français pour le parent.
import type { CodeBreakerParams } from '../../engine/types';

export function validateCodeBreaker(p: CodeBreakerParams): string[] {
  const errors: string[] = [];
  const distinct = new Set(p.colors).size;
  if (distinct !== p.colors.length) errors.push('code-breaker : une couleur est listée plusieurs fois dans "colors".');
  if (p.length < 2 || p.length > 4) errors.push('code-breaker : "length" doit valoir 2, 3 ou 4.');
  if (distinct < 3 || distinct > 6) errors.push('code-breaker : il faut de 3 à 6 couleurs différentes.');
  if (!p.repeats && distinct < p.length) {
    errors.push('code-breaker : sans répétition, il faut au moins autant de couleurs que de pions.');
  }
  if (p.feedback === 'counts' && p.length <= 2) {
    errors.push('code-breaker : l\'indice "counts" est déconseillé pour un code de 2 pions (utiliser "positional").');
  }
  if (!Number.isInteger(p.maxGuesses) || p.maxGuesses < 2) {
    errors.push('code-breaker : "maxGuesses" doit être un entier d\'au moins 2.');
  }
  return errors;
}
