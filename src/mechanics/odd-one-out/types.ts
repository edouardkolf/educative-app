// Données d'affichage propres à la mécanique « trouver l'intrus ».
import type { ChoiceId, ObjectId, Token } from '../../engine/types';

/** Un élément affiché : une forme colorée (differBy color/shape) ou un objet illustré (differBy category). */
export type OddOneOutItem =
  | { id: ChoiceId; kind: 'token'; token: Token }
  | { id: ChoiceId; kind: 'object'; objectId: ObjectId };

export interface OddOneOutRoundData {
  /** `params.items` éléments dans l'ordre d'affichage, un seul intrus parmi eux. */
  items: OddOneOutItem[];
}
