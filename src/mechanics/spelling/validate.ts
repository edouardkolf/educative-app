// Vérifications de contenu lisibles par un parent/PM non développeur (pas de jargon technique).
import type { SpellingParams } from '../../engine/types';
import { WORDS } from './words';

const MIN_CHOICES = 2;
const MAX_CHOICES = 4;

/** Renvoie la liste des problèmes trouvés dans les paramètres d'un niveau « orthographe » (vide = ok). */
export function validateParams(p: SpellingParams): string[] {
  const errors: string[] = [];

  if (!p.words || p.words.length === 0) {
    errors.push('Il faut choisir au moins un mot.');
    return errors;
  }
  for (const wordId of p.words) {
    if (!WORDS[wordId]) errors.push(`Le mot "${wordId}" n'existe pas dans le catalogue.`);
  }

  if (p.mode === 'pick' || p.mode === 'gap') {
    if (p.choices === undefined) {
      errors.push('Il manque le nombre de propositions (choices) pour ce mode.');
    } else if (p.choices < MIN_CHOICES || p.choices > MAX_CHOICES) {
      errors.push('Le nombre de propositions doit être entre 2 et 4.');
    } else {
      for (const wordId of p.words) {
        const entry = WORDS[wordId];
        if (!entry) continue;
        if (p.mode === 'pick') {
          const available = entry.misspellings.length;
          if (available < p.choices - 1) {
            errors.push(
              `Le mot "${entry.text}" n'a que ${available} variante(s) fautive(s) ` +
                `pour ${p.choices} propositions demandées : baissez "choices" ou ajoutez des variantes.`,
            );
          }
        } else {
          for (const gap of entry.gaps) {
            const available = gap.distractors.length;
            if (available < p.choices - 1) {
              errors.push(
                `Le mot "${entry.text}" (trou "${gap.missing}") n'a que ${available} lettre(s) piège(s) ` +
                  `pour ${p.choices} propositions demandées : baissez "choices" ou ajoutez des lettres pièges.`,
              );
            }
          }
        }
      }
    }
  }

  if (p.mode === 'tiles' && p.extraTiles === undefined) {
    errors.push('Il manque le nombre d\'étiquettes pièges (extraTiles) pour le mode "tiles".');
  }

  return errors;
}
