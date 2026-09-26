// Vérifications de contenu lisibles par un parent/PM non développeur (pas de jargon technique).
import type { ReadParams } from '../../engine/types';
import { computeFeasibleKinds, describeRoundKind } from './generate';

const MIN_CHOICES = 3;
const MAX_CHOICES = 4;

/**
 * Types de manche (voir generate.ts) qu'un niveau produira, en français — pour l'espace parent ou un
 * rapport de relecture. Vide si les paramètres sont irréalisables (validateParams les aura refusés).
 */
export function describeRoundKinds(p: ReadParams): string[] {
  return computeFeasibleKinds(p).map(describeRoundKind);
}

/** Renvoie la liste des problèmes trouvés dans les paramètres d'un niveau « Lis et montre » (vide = ok). */
export function validateParams(p: ReadParams): string[] {
  const errors: string[] = [];

  if (!p.traps || p.traps.length === 0) {
    errors.push('Il faut choisir au moins un piège (traps).');
  }

  if (!p.relations || p.relations.length === 0) {
    errors.push('Il faut choisir au moins une position (relations).');
    return errors;
  }

  if (p.choices === undefined || p.choices < MIN_CHOICES || p.choices > MAX_CHOICES) {
    errors.push('Le nombre d\'images proposées (choices) doit être 3 ou 4.');
  }

  if (p.sentences !== 1 && p.sentences !== 2) {
    errors.push('Le nombre de phrases (sentences) doit être 1 ou 2.');
  }

  // La négation se joue toujours à 3 images (une phrase niée n'a que 2 images fausses possibles :
  // l'affirmation et le nombre inversé, jamais 3) : elle est incompatible avec 4 choix ou 2 phrases.
  if (p.traps?.includes('negation')) {
    if (p.choices === 4) {
      errors.push('Le piège "negation" ne peut pas se jouer à 4 images (choices: 4) : la négation se joue à 3 images.');
    }
    if (p.sentences === 2) {
      errors.push('Le piège "negation" ne peut pas se jouer à 2 phrases (sentences: 2) : la négation se joue à 3 images, 1 phrase.');
    }
    if (p.choices === 3 && p.sentences === 1 && !p.traps.includes('number')) {
      errors.push(
        'Le piège "negation" à 3 images a besoin du piège "number" (nombre inversé pour la 3ᵉ image) : ajoutez "number" aux traps.',
      );
    }
  }

  // On ne poursuit que si les champs de base sont bien formés : computeFeasibleKinds suppose des valeurs
  // dans les bornes attendues.
  if (errors.length > 0) return errors;

  const kinds = computeFeasibleKinds(p);
  if (kinds.length === 0) {
    errors.push(
      'Avec ces réglages (pièges, positions, choices, sentences), aucun type de manche n\'est réalisable : ' +
        'élargissez "relations", ajoutez un piège, ou changez "choices"/"sentences". Types possibles : ' +
        'noun3 (3 images, choices 3), position3 (3 images, choices 3, un support avec ≥3 positions dans ' +
        'relations), negation3 (3 images, choices 3, negation+number), cross4 (4 images, 1 phrase, 2 traits ' +
        'parmi noun/number/position), twoSentenceCross4 (4 images, 2 phrases).',
    );
  }

  return errors;
}
