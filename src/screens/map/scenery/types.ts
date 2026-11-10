// Contrat d'un monde de la carte : chaque monde (forest, sea, mountain, clouds) dessine son sol, son
// chemin, sa frontière d'arrivée, ses lieux et son décor, et le fond de ses parties. L'assemblage (ordre des
// calques, découpe du chemin par bande, panneau d'entrée) est fait par MapScenery.tsx.
// Voir docs/specs/CARTE-MONDES.md.
import type { FunctionComponent } from 'preact';
import type { Footprint, Passage, Point, Route, WorldBand } from '../layout';

/** Tout ce qu'un monde sait de sa bande de carte. Coordonnées en pixels de la carte (y vers le bas). */
export interface SceneContext {
  band: WorldBand;
  /** Largeur de la carte (≈ 360 à 430 px sur téléphone). */
  width: number;
  /** Nombre de niveaux du parcours entier. */
  count: number;
  route: Route;
  /** Attribut `d` du chemin entier (courbe lisse). */
  d: string;
  /** Échantillons du chemin entier (≈ tous les 10–15 px). */
  samples: readonly Point[];
  /** Les échantillons de la bande, avec 80 px de marge au-dessus et au-dessous. */
  bandSamples: readonly Point[];
  /** Position de chaque niveau du parcours (indice = numéro du niveau − 1). */
  nodes: readonly Point[];
  /** Indices des niveaux de cette bande, de bas en haut. */
  levels: readonly number[];
  /** Panneau d'entrée du monde (dessiné par l'assemblage) : à garder dégagé. */
  sign: Point;
  /** Frontière du bas (on arrive du monde précédent), sinon null (premier monde). */
  passageIn: Passage | null;
  /** Frontière du haut (on part vers le monde suivant), sinon null (dernier monde). */
  passageOut: Passage | null;
  /** Le parcours s'arrête dans ce monde : bout du chemin, où dessiner la destination. Null en montagne
   * (le chemin y finit à la pointe) et pour les mondes qui ne sont pas les derniers. */
  end: Point | null;
}

export interface SceneProps<P> {
  ctx: SceneContext;
  prep: P;
}

export interface PassageProps {
  passage: Passage;
  /** Le monde d'arrivée (celui qui dessine la frontière). */
  ctx: SceneContext;
  /** Le monde d'où l'on vient, juste en dessous. */
  below: SceneContext;
}

export interface WorldScene<P> {
  /** Calculs purs et déterministes (zones, lieux, décor), faits une fois par carte. */
  prepare(ctx: SceneContext): P;
  /** Sous le chemin : sol, eau, ciel, zones, rivières… Peut déborder de la bande. */
  Ground: FunctionComponent<SceneProps<P>>;
  /** Le chemin de ce monde. L'assemblage le découpe à la bande ; il est dessiné par-dessus tous les sols. */
  Path: FunctionComponent<SceneProps<P>>;
  /** Frontière d'arrivée (plage, crête…), sous les chemins. */
  Border?: FunctionComponent<PassageProps>;
  /** Ouvrage de la frontière d'arrivée (ponton, col, échelle…), par-dessus les chemins. */
  Passage?: FunctionComponent<PassageProps>;
  /** Lieux et décor, par-dessus le chemin (sous les niveaux, qui sont en HTML au-dessus de la carte). */
  Above: FunctionComponent<SceneProps<P>>;
  /** Destination au bout du chemin, quand `ctx.end` n'est pas null. */
  End?: FunctionComponent<SceneProps<P> & { at: Point }>;
  /** Emprises des grands lieux, pour le test qui vérifie qu'aucun ne mord sur le chemin ni un niveau. */
  footprints?(prep: P): Footprint[];
  /** Fond d'une partie de ce monde : contenu d'un SVG de BACKDROP_WIDTH × BACKDROP_HEIGHT (sous un voile). */
  Backdrop: FunctionComponent<Record<string, never>>;
}

/** Fige le type de `prep` d'un monde tout en le rangeant avec les autres. */
export function defineScene<P>(scene: WorldScene<P>): WorldScene<unknown> {
  return scene as unknown as WorldScene<unknown>;
}
