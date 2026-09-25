// Données d'affichage propres à la mécanique « compter des objets ».
import type { ChoiceId, CountParams, ObjectId } from '../../engine/types';

export interface CountRoundData {
  /** Objet illustré affiché pour cette manche (un seul type par manche). */
  objectId: ObjectId;
  /** Nombre cible à compter. */
  count: number;
  layout: CountParams['layout'];
  /** Position normalisée (0–1) de chaque objet dans le cadre de jeu, calculée par generate.ts. */
  positions: { x: number; y: number }[];
  /** Propositions affichées (déjà mélangées). */
  choices: { id: ChoiceId; value: number }[];
  answers: CountParams['answers'];
}
