// CONTRAT (signatures) — contenu du programme de lecture : graphèmes, syllabes, mots. LECTURE.md §3.
// SOUCHE posée par l'orchestrateur : la tâche L2 remplit les données et les fonctions.
import type { Grapheme, GraphemeId, ItemId, ReadingGameId, ReadingSkill, ReadingStage, ReadWord, Syllable } from './types';

/** Tous les graphèmes, triés par `order`. */
export const GRAPHEMES: readonly Grapheme[] = [];
/** Syllabes consonne + voyelle de la machine à syllabes. */
export const SYLLABLES: readonly Syllable[] = [];
/** Mots déchiffrables de l'étape 5. */
export const READ_WORDS: readonly ReadWord[] = [];

export function getGrapheme(_id: GraphemeId): Grapheme | undefined {
  throw new Error('L2 : à implémenter');
}

export function graphemeItem(id: GraphemeId): ItemId {
  return `g:${id}`;
}

export function skillItem(skill: ReadingSkill): ItemId {
  return `k:${skill}`;
}

/** Items de l'étape, dans l'ordre d'introduction (compétences comprises). */
export function stageItems(_stage: ReadingStage): ItemId[] {
  throw new Error('L2 : à implémenter');
}

/** Parmi `stageItems`, ceux qui doivent être acquis pour passer à l'étape suivante. */
export function gatedItems(_stage: ReadingStage): ItemId[] {
  throw new Error('L2 : à implémenter');
}

/** Tous les items du programme, toutes étapes. */
export function allItems(): ItemId[] {
  throw new Error('L2 : à implémenter');
}

/** Jeux qui peuvent interroger cet item (LECTURE.md §4, tableau). */
export function gamesForItem(_item: ItemId): ReadingGameId[] {
  throw new Error('L2 : à implémenter');
}
