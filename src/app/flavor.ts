// Variante de l'app (docs/specs/LECTURE-APP.md) : une même base de code, deux apps publiées séparément.
// - « malins » : Petits Malins, maternelle et CE1, carte de compétences et tous les jeux libres ;
// - « lecture » : Petits Lecteurs, maternelle seulement, l'aventure = le parcours de lecture, plus les mini-jeux.
// Fixée au build par `VITE_APP_FLAVOR` (vite.lecture.config.ts) ; absente = « malins » (tests compris).
// Aucun accès au DOM : testable sous Vitest (node).

export type FlavorId = 'malins' | 'lecture';

export interface Flavor {
  id: FlavorId;
  /** Nom affiché (titre, espace parent). */
  appName: string;
  /** Base IndexedDB : deux apps servies depuis la même origine (GitHub Pages) ne partagent jamais leurs données. */
  dbName: string;
  /** Parcours proposés au parent (`Track.id`) ; null = tous ceux du dossier content/tracks. */
  trackIds: readonly string[] | null;
  /** Libellé du parcours pour le parent, à la place du titre du parcours ; absent = titre du parcours. */
  trackLabel?: string;
  /** Jeux du registre embarqués (`GameId`) ; null = tous. */
  gameIds: readonly string[] | null;
  /**
   * Jeu qui tient lieu d'aventure (la tuile « carte » du hub y mène) : toujours visible, jamais une tuile de jeu
   * libre. null = l'aventure est la carte des niveaux de compétences (content/tracks).
   */
  adventureGame: 'reading' | null;
}

export const MALINS_FLAVOR: Flavor = {
  id: 'malins',
  appName: 'Petits Malins',
  dbName: 'petits-malins',
  trackIds: null,
  gameIds: null,
  adventureGame: null,
};

export const LECTURE_FLAVOR: Flavor = {
  id: 'lecture',
  appName: 'Petits Lecteurs',
  dbName: 'petits-lecteurs',
  trackIds: ['ms'],
  trackLabel: 'Maternelle',
  // Mini-jeux de maternelle du hub, autour de l'aventure de lecture.
  gameIds: ['reading', 'coloring', 'memory', 'order', 'maze', 'robot'],
  adventureGame: 'reading',
};

export function flavorFor(id: string | undefined): Flavor {
  return id === 'lecture' ? LECTURE_FLAVOR : MALINS_FLAVOR;
}

export const FLAVOR: Flavor = flavorFor(import.meta.env.VITE_APP_FLAVOR);
