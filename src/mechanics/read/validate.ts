// Vérifications de contenu lisibles par un parent/PM non développeur (pas de jargon technique).
import { ANCHOR_RELATIONS } from '../../engine/types';
import type { AnchorId, ReadParams, Relation } from '../../engine/types';
import { ANCHOR_IDS, SUBJECTS, SUBJECT_IDS, usableRelations } from './catalog';

const MIN_CHOICES = 3;
const MAX_CHOICES = 4;

/** Toutes les positions que ce support sait montrer, quelle que soit `relations`. */
function fullRelationCount(anchor: AnchorId): number {
  return (ANCHOR_RELATIONS[anchor] as readonly Relation[]).length;
}

function bestNounCount(): number {
  return Math.max(0, ...SUBJECT_IDS.map((id) => SUBJECTS[id].lookAlikes.length));
}

/**
 * Le meilleur nombre d'images fausses qu'une phrase AFFIRMATIVE peut fournir : noun + number + position
 * (position pioche dans toutes les positions que le support sait montrer, pas seulement `relations`,
 * qui ne cadre que la phrase lue).
 */
function bestAffirmativeAlts(params: ReadParams, compatibleAnchors: readonly AnchorId[]): number {
  let total = 0;
  if (params.traps.includes('noun')) total += bestNounCount();
  if (params.traps.includes('number')) total += 1;
  if (params.traps.includes('position')) {
    total += Math.max(0, ...compatibleAnchors.map((a) => fullRelationCount(a) - 1));
  }
  return total;
}

/**
 * Le meilleur nombre d'images fausses qu'une phrase NÉGATIVE peut fournir : noun + number + negation.
 * Le piège "position" ne s'y applique jamais (changer de position sur une phrase niée resterait vrai :
 * seule l'affirmation, piège "negation", y est une image fausse) — les deux pièges ne se cumulent donc
 * jamais sur une même phrase, contrairement à noun/number qui s'appliquent dans les deux cas.
 */
function bestNegatedAlts(params: ReadParams, compatibleAnchors: readonly AnchorId[]): number {
  if (!params.traps.includes('negation')) return 0;
  const anchorsWithAlternate = compatibleAnchors.filter((a) => fullRelationCount(a) >= 2);
  if (anchorsWithAlternate.length === 0) return 0;
  let total = 1; // l'affirmation
  if (params.traps.includes('noun')) total += bestNounCount();
  if (params.traps.includes('number')) total += 1;
  return total;
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

  const compatibleAnchors = ANCHOR_IDS.filter((a) => usableRelations(a, p.relations).length >= 1);
  if (compatibleAnchors.length === 0) {
    errors.push(
      "Aucun support (table, chaise, boîte, lit, arbre) ne sait montrer une des positions choisies : changez relations.",
    );
  }

  if (p.traps?.includes('position') && p.relations.length < 2) {
    errors.push('Le piège "position" demande au moins 2 positions différentes dans relations.');
  }

  if (p.traps?.includes('noun')) {
    const hasLookAlike = SUBJECT_IDS.some((id) => SUBJECTS[id].lookAlikes.length > 0);
    if (!hasLookAlike) {
      errors.push('Le piège "noun" demande au moins une paire de sujets qui se ressemblent à l\'écrit (catalogue vide).');
    }
  }

  if (p.choices === undefined || p.choices < MIN_CHOICES || p.choices > MAX_CHOICES) {
    errors.push('Le nombre d\'images proposées (choices) doit être 3 ou 4.');
  } else if (p.traps && p.traps.length > 0 && compatibleAnchors.length > 0) {
    const needed = p.choices - 1;
    // generateRounds exige que CHAQUE phrase, à elle seule, puisse fournir toutes les images fausses
    // demandées (jamais de dépendance à un heureux tirage combiné entre 2 phrases) : la borne ne dépend
    // donc pas de `sentences`. Affirmatif et nié ne cumulent jamais leurs pièges sur une même phrase
    // (voir bestNegatedAlts) : il suffit que L'UNE des deux polarités atteigne `needed` — le générateur
    // évite alors l'autre polarité au tirage (si seule l'affirmative suffit, "negation" ne se déclenche
    // simplement jamais).
    const best = Math.max(bestAffirmativeAlts(p, compatibleAnchors), bestNegatedAlts(p, compatibleAnchors));
    if (best < needed) {
      errors.push(
        `Avec ces pièges et ces positions, on ne peut fabriquer que ${best} image(s) fausse(s) distincte(s) ` +
          `au mieux (par phrase), pour ${needed} demandée(s) : baissez "choices", ajoutez des pièges ` +
          '(noun, number) ou des positions.',
      );
    }
    // Sans ce contrôle, un niveau « négation » passerait la validation mais n'afficherait jamais de phrase négative.
    const negated = bestNegatedAlts(p, compatibleAnchors);
    if (p.traps.includes('negation') && negated < needed) {
      errors.push(
        `Le piège "negation" ne se déclenchera jamais : une phrase négative ne peut fournir que ${negated} ` +
          `image(s) fausse(s) pour ${needed} demandée(s). Ajoutez "noun" ou "number" aux pièges, ou baissez "choices".`,
      );
    }
  }

  if (p.sentences !== 1 && p.sentences !== 2) {
    errors.push('Le nombre de phrases (sentences) doit être 1 ou 2.');
  } else if (p.sentences === 2 && compatibleAnchors.length < 2) {
    // Deux phrases utilisent deux supports différents : il en faut au moins deux compatibles.
    errors.push('Avec 2 phrases, il faut au moins 2 supports compatibles avec les positions choisies (un par phrase).');
  }

  return errors;
}
