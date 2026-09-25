// CONTRAT (local à la mécanique) — les figures du « constructeur » : dessinées une fois en dur,
// dans un repère 100×100 (voir docs/CONTENU.md). Chaque figure a au plus 5 emplacements, chacun
// défini par une forme, une taille (largeur/hauteur) et un centre (x, y), tous à l'intérieur du
// repère. Aucune rotation : les pièces gardent l'orientation dessinée ici.
import type { Color, FigureId } from '../../engine/types';

/** Formes disponibles au constructeur (sous-ensemble du vocabulaire visuel + le rectangle). */
export const BUILDER_SHAPES = ['circle', 'square', 'triangle', 'rectangle'] as const;
export type BuilderShape = (typeof BUILDER_SHAPES)[number];

/** Un emplacement de la figure : la pièce qui doit s'y poser, en repère 100×100. */
export interface FigureSlot {
  shape: BuilderShape;
  /** Largeur de la boîte englobante (diamètre pour un cercle, côté pour un carré). */
  w: number;
  /** Hauteur de la boîte englobante (= w pour cercle/carré). */
  h: number;
  /** Centre de l'emplacement. */
  x: number;
  y: number;
  color: Color;
}

/** Animation de fin (quand tous les emplacements sont remplis), CSS pures — voir builder.css. */
export type EndAnimation = 'pop' | 'slide-right' | 'slide-up' | 'hop';

export interface Figure {
  id: FigureId;
  slots: FigureSlot[];
  endAnimation: EndAnimation;
}

const HOUSE: Figure = {
  id: 'house',
  endAnimation: 'pop', // la fenêtre s'allume / la porte s'ouvre
  slots: [
    { shape: 'square', w: 50, h: 40, x: 50, y: 65, color: 'yellow' },
    { shape: 'triangle', w: 60, h: 25, x: 50, y: 30, color: 'red' },
    { shape: 'rectangle', w: 16, h: 24, x: 50, y: 86, color: 'blue' },
  ],
};

const TREE: Figure = {
  id: 'tree',
  endAnimation: 'pop', // scintille
  slots: [
    { shape: 'triangle', w: 50, h: 45, x: 50, y: 38, color: 'green' },
    { shape: 'rectangle', w: 14, h: 25, x: 50, y: 80, color: 'orange' },
  ],
};

const BOAT: Figure = {
  id: 'boat',
  endAnimation: 'slide-right', // prend le large
  slots: [
    { shape: 'rectangle', w: 60, h: 20, x: 50, y: 75, color: 'blue' },
    { shape: 'triangle', w: 30, h: 45, x: 50, y: 40, color: 'red' },
  ],
};

const CAR: Figure = {
  id: 'car',
  endAnimation: 'slide-right', // démarre
  slots: [
    { shape: 'rectangle', w: 60, h: 25, x: 50, y: 65, color: 'red' },
    { shape: 'square', w: 24, h: 24, x: 50, y: 45, color: 'blue' },
    { shape: 'circle', w: 18, h: 18, x: 32, y: 80, color: 'purple' },
    { shape: 'circle', w: 18, h: 18, x: 68, y: 80, color: 'purple' },
  ],
};

const ROCKET: Figure = {
  id: 'rocket',
  endAnimation: 'slide-up', // décolle
  slots: [
    { shape: 'rectangle', w: 20, h: 45, x: 50, y: 55, color: 'blue' },
    { shape: 'triangle', w: 20, h: 20, x: 50, y: 27, color: 'red' },
    { shape: 'triangle', w: 14, h: 18, x: 34, y: 78, color: 'yellow' },
    { shape: 'triangle', w: 14, h: 18, x: 66, y: 78, color: 'yellow' },
  ],
};

const FISH: Figure = {
  id: 'fish',
  endAnimation: 'slide-right', // s'échappe en nageant
  slots: [
    { shape: 'circle', w: 50, h: 50, x: 45, y: 50, color: 'orange' },
    { shape: 'triangle', w: 26, h: 30, x: 80, y: 50, color: 'blue' },
  ],
};

const ROBOT: Figure = {
  id: 'robot',
  endAnimation: 'hop', // sautille de joie
  slots: [
    { shape: 'square', w: 40, h: 40, x: 50, y: 60, color: 'blue' },
    { shape: 'square', w: 22, h: 22, x: 50, y: 28, color: 'purple' },
    { shape: 'rectangle', w: 12, h: 30, x: 22, y: 60, color: 'orange' },
    { shape: 'rectangle', w: 12, h: 30, x: 78, y: 60, color: 'orange' },
  ],
};

const SNOWMAN: Figure = {
  id: 'snowman',
  endAnimation: 'hop',
  slots: [
    { shape: 'circle', w: 50, h: 50, x: 50, y: 72, color: 'blue' },
    { shape: 'circle', w: 36, h: 36, x: 50, y: 40, color: 'blue' },
    { shape: 'circle', w: 22, h: 22, x: 50, y: 15, color: 'blue' },
  ],
};

const CASTLE: Figure = {
  id: 'castle',
  endAnimation: 'pop', // le drapeau flotte
  slots: [
    { shape: 'rectangle', w: 50, h: 35, x: 50, y: 70, color: 'yellow' },
    { shape: 'rectangle', w: 16, h: 45, x: 20, y: 60, color: 'orange' },
    { shape: 'rectangle', w: 16, h: 45, x: 80, y: 60, color: 'orange' },
    { shape: 'triangle', w: 18, h: 16, x: 20, y: 34, color: 'red' },
    { shape: 'triangle', w: 18, h: 16, x: 80, y: 34, color: 'red' },
  ],
};

export const FIGURES: Record<FigureId, Figure> = {
  house: HOUSE,
  tree: TREE,
  boat: BOAT,
  car: CAR,
  rocket: ROCKET,
  fish: FISH,
  robot: ROBOT,
  snowman: SNOWMAN,
  castle: CASTLE,
};

export function getFigure(id: FigureId): Figure {
  return FIGURES[id];
}
