// Données d'affichage propres à la mécanique « color-mix » (laboratoire des couleurs).
import type { Color } from '../../engine/types';

export interface ColorMixRoundData {
  /** Couleur à obtenir en versant deux fioles (identique à `round.answer`). */
  target: Color;
}
