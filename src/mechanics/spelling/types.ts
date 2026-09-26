// Données propres à la mécanique « orthographe » : catalogue de mots + manches générées.
import type { ChoiceId, SpellingParams, WordId } from '../../engine/types';

/** Un découpage du mot pour le mode « gap » : before + missing + after reconstitue `text`. */
export interface GapSpec {
  before: string;
  missing: string;
  after: string;
  /** Lettres proposées à la place de `missing`, toutes différentes de `missing` (≥ 3). */
  distractors: string[];
}

/** Proximité d'une variante fautive avec le bon mot (voir SpellingParams.closeness). */
export type Closeness = 1 | 2 | 3;

/** Une entrée du catalogue (src/mechanics/spelling/words.ts). */
export interface WordEntry {
  /** Orthographe exacte du mot (apostrophe droite '). */
  text: string;
  /**
   * Variantes fautives plausibles pour un CE1, jamais égales à `text`, classées par proximité avec le bon mot :
   * 1 = grossières, 2 = moyennes, 3 = subtiles (un accent, une lettre). Au moins 2 par niveau.
   */
  misspellings: Record<Closeness, string[]>;
  /** Découpages possibles pour le mode « gap » (1 à 2). */
  gaps: GapSpec[];
  /** Phrases d'exemple, le mot remplacé par « ___ » exactement une fois (≥ 3). */
  sentences: string[];
}

/** Une proposition affichée (mode pick : le mot entier ; mode gap : des lettres). */
export interface SpellingChoiceOption {
  id: ChoiceId;
  text: string;
}

interface SpellingRoundBase {
  wordId: WordId;
  /** Orthographe correcte : utilisée pour la lecture à voix haute et pour révéler le mot résolu. */
  word: string;
  /** Phrase avec un trou « ___ » à la place du mot, si `params.sentence`. */
  sentence?: string;
}

export interface PickRoundData extends SpellingRoundBase {
  mode: 'pick';
  choices: SpellingChoiceOption[];
}

export interface GapRoundData extends SpellingRoundBase {
  mode: 'gap';
  before: string;
  missing: string;
  after: string;
  choices: SpellingChoiceOption[];
}

export interface TilesRoundData extends SpellingRoundBase {
  mode: 'tiles';
  /** Lettres du mot dans l'ordre, apostrophe exclue (elle est déjà posée à l'affichage). */
  letters: string[];
  /** Index (dans `letters`) après lequel afficher l'apostrophe déjà posée ; absent si le mot n'en a pas. */
  apostropheAfterIndex?: number;
  /** Étiquettes mélangées posées sur le plateau : lettres du mot + pièges. Index stable → data-choice="tile-<i>". */
  tiles: string[];
}

export type SpellingRoundData = PickRoundData | GapRoundData | TilesRoundData;

export type { SpellingParams };
