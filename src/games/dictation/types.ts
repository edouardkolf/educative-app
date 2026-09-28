// Types du contenu de la dictée quotidienne (docs/specs/DICTEE.md §4.1).
import type { WorldId } from '../../screens/map/layout';

/** Identifiant stable d'un mot (enregistré dans les dictées) : /^[a-z0-9]+(-[a-z0-9]+)*$/ */
export type DictationWordId = string;

export interface DictationWord {
  id: DictationWordId;
  /** Orthographe exacte, en minuscules, apostrophe droite. */
  text: string;
  /** Au moins 3 phrases, avec « ___ » une seule fois à la place du mot ; jamais affichées. */
  sentences: string[];
  /** Prononciation forcée du mot seul. */
  say?: string;
  /** Clé du groupe d'homophones, ex. "ver" pour ver, vers, verre, vert. */
  homophones?: string;
}

export interface DictationSeries {
  /** "s1"… ; stable. */
  id: string;
  /** Rang dans la liste de la classe ; « précédentes » = numéro inférieur. */
  number: number;
  /** Monde de la carte (src/screens/map/layout.ts). */
  world?: WorldId;
  words: DictationWordId[];
}
