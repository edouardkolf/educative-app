// Données d'affichage propres à la mécanique « comparer » (CE1).
import type { CompareChoice } from '../../engine/types';

/** Un côté de la comparaison : un nombre seul (1 terme) ou une somme (2 termes). */
export interface Side {
  /** Termes affichés dans l'ordre (1 élément = nombre seul, 2 éléments = "a + b"). */
  terms: number[];
  /** Valeur du côté (= somme des termes). */
  value: number;
}

export interface CompareRoundData {
  left: Side;
  right: Side;
}

export type { CompareChoice };
