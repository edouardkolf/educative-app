// Données d'affichage propres à la mécanique « compléter une suite ».
import type { ChoiceId, Token } from '../../engine/types';

export interface SequenceRoundData {
  /** Les cases de la suite, dans l'ordre ; null = case à compléter. */
  items: (Token | null)[];
  /** Index de la case à compléter dans `items`. */
  blankIndex: number;
  /** Propositions affichées (déjà mélangées). */
  choices: { id: ChoiceId; token: Token }[];
}
