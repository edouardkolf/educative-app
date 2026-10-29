import type { HangmanWord } from '../../games/hangman/types';

/** Une manche : un mot principal puis des mots de réserve, pris si l'enfant perd le précédent. */
export interface HangmanRoundData {
  /** `words[0]` est le mot principal (son id est la réponse de la manche). */
  words: HangmanWord[];
  maxMistakes: number;
}
