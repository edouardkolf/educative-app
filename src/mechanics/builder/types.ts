// Données d'affichage propres à la mécanique « builder » (le constructeur).
import type { Color, FigureId } from '../../engine/types';
import type { BuilderShape, EndAnimation } from './figures';

/** Un emplacement affiché, avec son identifiant tapable (`slot-<i>`). */
export interface BuilderSlotData {
  id: string;
  shape: BuilderShape;
  w: number;
  h: number;
  x: number;
  y: number;
  color: Color;
}

/** Une pièce du plateau, avec son identifiant tapable (`piece-<i>`). Les distracteurs ne
 * correspondent (forme + taille) à aucun `BuilderSlotData` de la manche. */
export interface BuilderPieceData {
  id: string;
  shape: BuilderShape;
  w: number;
  h: number;
  color: Color;
}

export interface BuilderRoundData {
  figureId: FigureId;
  endAnimation: EndAnimation;
  /** Emplacements, dans l'ordre fixe de la figure (positions stables). */
  slots: BuilderSlotData[];
  /** Pièces du plateau (mélangées : une par emplacement + les distracteurs). */
  pieces: BuilderPieceData[];
}
