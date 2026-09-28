// CONTRAT (local au coloriage) — modèle d'un dessin (docs/specs/COLORIAGE.md §4.1).
// Repère 100 × 100, origine en haut à gauche, comme les figures du constructeur.
import type { Color, FigureId, Shape } from '../../engine/types';
import type { EndAnimation } from '../../mechanics/builder/figures';
import type { ColoringTier } from '../../storage/colorings';

export type Primitive =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number } // (x, y) = coin haut-gauche
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: [number, number][] }; // triangles, toits, vagues en ligne brisée

export type Detail = 1 | 2 | 3;
export type LifeAnimation = 'pulse' | 'drift' | 'bob' | 'sway' | 'twinkle';

interface LayerBase {
  /** Union : nuage = ellipse + cercles ; contour extérieur seul (trait, puis remplissage par-dessus). */
  shape: Primitive[];
  /** Présent à partir de ce niveau de détail. */
  detail: Detail;
  /** Mouvement quand le dessin prend vie. */
  life?: LifeAnimation;
  /** Pièce de la figure : une par emplacement de FIGURES[figure].slots. */
  piece?: true;
}

export interface ZoneLayer extends LayerBase {
  kind: 'zone';
  /** Stable : clé des enregistrements. Ne jamais renommer une case publiée. */
  id: string;
  /** Centre du code magique. */
  anchor: { x: number; y: number };
  /** Couleurs possibles ; palette[0] = couleur naturelle. */
  palette: Color[];
  /** Cases jumelles, toujours de la même couleur (roues, fenêtres). */
  pair?: string;
  /** Voisines jamais de la même couleur (toit et ciel). */
  differentFrom?: string[];
}

/** Reste blanc (nuage, neige, voile). Occulte les calques du dessous. */
export interface BlankLayer extends LayerBase {
  kind: 'blank';
  endOnly?: true;
}

/** Trait d'encre (yeux, rayons, tirets) : jamais tapable, laisse passer le tap à la case du dessous. */
export interface InkLayer {
  kind: 'ink';
  d: string;
  detail: Detail;
  filled?: true;
  life?: LifeAnimation;
  endOnly?: true;
}

/** Ordre du tableau = ordre de peinture (fond d'abord). */
export type Layer = ZoneLayer | BlankLayer | InkLayer;

export interface Subject {
  figure: FigureId;
  endAnimation: EndAnimation;
  layers: Layer[];
}

export interface Drawing {
  id: string;
  background: Layer[];
  subjects: [Subject] | [Subject, Subject];
  foreground?: Layer[];
}

/** Symbole d'une case aux paliers 3 (forme) et 4 (face de dé). */
export type CodeSymbol = Shape | `dice-${1 | 2 | 3 | 4 | 5 | 6}`;

export const DETAIL_FOR_TIER: Record<ColoringTier, Detail> = { 1: 1, 2: 2, 3: 2, 4: 3 };
export const ZONES_PER_DETAIL: Record<Detail, [number, number]> = { 1: [6, 9], 2: [9, 13], 3: [12, 17] };
/** Disque du code, en unités (≥ 33 px au pire). */
export const ANCHOR_R = 5.5;
/** Entre deux ancres : 36 px au pire, le rayon tapable. */
export const MIN_ANCHOR_GAP = 12;
export const HIT_RADIUS_PX = 36;
export const WORST_DRAWING_PX = 300;
