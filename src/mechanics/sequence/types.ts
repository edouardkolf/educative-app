// Données d'affichage propres à la mécanique « compléter une suite ».
import type { ChoiceId, ObjectId, Token } from '../../engine/types';

/** Un élément de suite : une forme colorée (vary color/shape/both), un objet illustré (vary object) ou un nombre (vary number). */
export type SequenceItem =
  | { kind: 'token'; token: Token }
  | { kind: 'object'; objectId: ObjectId }
  | { kind: 'number'; value: number };

export interface SequenceRoundData {
  /** Les cases de la suite, dans l'ordre ; null = case à compléter. */
  items: (SequenceItem | null)[];
  /** Index de la case à compléter dans `items`. */
  blankIndex: number;
  /** Propositions affichées (déjà mélangées). */
  choices: { id: ChoiceId; item: SequenceItem }[];
}
