// CONTRAT — types du contenu pédagogique et des mécaniques.
// Ces types décrivent exactement les fichiers JSON de `content/` (voir content/level.schema.json).
// Toute évolution se fait ici ET dans le schéma JSON, en même temps.

import type { FunctionComponent } from 'preact';

// ---------- Vocabulaire visuel ----------

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'] as const;
export type Shape = (typeof SHAPES)[number];

export const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'] as const;
export type Color = (typeof COLORS)[number];

/** Une forme colorée (unité de base des suites et de l'intrus « couleur / forme »). */
export interface Token {
  shape: Shape;
  color: Color;
}

export const OBJECT_CATEGORIES = ['fruit', 'animal', 'vehicle', 'toy', 'plant'] as const;
export type ObjectCategory = (typeof OBJECT_CATEGORIES)[number];

/** Identifiant d'un objet illustré du catalogue `src/ui/objects.ts` (ex. "apple"). */
export type ObjectId = string;

// ---------- Niveaux et parcours ----------

export const MECHANICS = ['sequence', 'count', 'odd-one-out', 'color-mix', 'sort'] as const;
export type MechanicId = (typeof MECHANICS)[number];

export const SKILLS = ['patterns', 'counting', 'visual-discrimination', 'categorization', 'color-mixing'] as const;
/** Compétence visée, sert à regrouper les statistiques côté parent. */
export type SkillId = (typeof SKILLS)[number];

/** Compléter une suite. Chaque lettre du motif est un élément distinct : "AB", "AAB", "ABC"… */
export interface SequenceParams {
  pattern: string;
  /** Ce qui distingue les éléments du motif. "object" : émojis du catalogue plutôt que forme/couleur. */
  vary: 'color' | 'shape' | 'both' | 'object';
  /** Réservoir de couleurs où piocher (requis si vary = "color"/"shape"/"both", au moins autant que de lettres distinctes si vary ≠ shape). */
  colors?: Color[];
  /** Réservoir de formes où piocher (requis si vary = "color"/"shape"/"both", au moins autant que de lettres distinctes si vary ≠ color). */
  shapes?: Shape[];
  /** Réservoir d'objets où piocher (requis, et uniquement utilisé, si vary = "object" ; au moins autant que de lettres distinctes). */
  objects?: ObjectId[];
  /** Nombre total de cases affichées, case à compléter comprise (4 à 10). */
  length: number;
  /** "end" : continuer la suite ; "middle" : combler un trou. */
  blank: 'end' | 'middle';
  /** Nombre de propositions (2 à 4). */
  choices: number;
}

/** Compter des objets et taper le bon nombre. */
export interface CountParams {
  min: number;
  max: number;
  /** Objets possibles (un seul type d'objet par manche, tiré au hasard). */
  objects: ObjectId[];
  /** "line" : alignés ; "scatter" : éparpillés ; "dice" : constellations de dé (max 6). */
  layout: 'line' | 'scatter' | 'dice';
  /** Nombre de propositions (2 à 4). */
  choices: number;
  /** Présentation des réponses : chiffres, points, ou les deux. */
  answers: 'digits' | 'dots' | 'digits+dots';
}

/** Trouver l'intrus parmi `items` éléments. */
export interface OddOneOutParams {
  /** Nombre d'éléments affichés, intrus compris (3 à 6). */
  items: number;
  /** En quoi l'intrus diffère des autres. */
  differBy: 'color' | 'shape' | 'category';
  colors?: Color[];
  shapes?: Shape[];
  categories?: ObjectCategory[];
  /**
   * Plus difficile : les éléments « normaux » varient sur une autre dimension.
   * color → formes différentes ; shape → couleurs différentes ; category → objets différents d'une même catégorie.
   */
  distract: boolean;
}

/** Le laboratoire des couleurs : mélanger deux couleurs primaires pour obtenir une couleur cible. */
export interface ColorMixParams {
  /**
   * Couleurs cibles proposées, tirées au hasard manche après manche (jamais deux fois de suite).
   * Une cible primaire (red/blue/yellow) se réalise en versant deux fois la même fiole.
   */
  targets: Color[];
}

/** Le trieur magique : ranger un objet dans le bon panier parmi 2 ou 3 familles. */
export interface SortParams {
  /**
   * Les paniers, dans l'ordre d'affichage fixe (position stable niveau après niveau, pour que
   * l'enfant apprenne où est chaque famille). 2 à 3 groupes, au moins 2 objets chacun.
   */
  groups: {
    id: string;
    /** Émoji géant affiché sur le panier (ex. "🚜"). */
    symbol: string;
    objects: ObjectId[];
  }[];
}

export interface MechanicParamsMap {
  sequence: SequenceParams;
  count: CountParams;
  'odd-one-out': OddOneOutParams;
  'color-mix': ColorMixParams;
  sort: SortParams;
}

interface LevelBase {
  $schema?: string;
  /** Identifiant unique, identique au nom du fichier sans `.json` (ex. "ms-suite-01"). */
  id: string;
  /** Titre lisible par le parent (statistiques). */
  title: string;
  skill: SkillId;
  /** Objectif pédagogique en une phrase, lisible par le parent. */
  objective: string;
  /** Nombre de manches dans le niveau (3 à 10). */
  rounds: number;
  /** Affiche la main animée qui montre le geste pendant la première manche. */
  tutorial?: boolean;
  /** Seuils d'étoiles, en nombre de manches ratées au premier essai. Défaut : { maxMissesFor3: 0, maxMissesFor2: 1 }. */
  stars?: { maxMissesFor3: number; maxMissesFor2: number };
  /** Réservé aux consignes audio (V2). Vide en V1. */
  audio?: { instruction?: string };
}

export type Level = {
  [M in MechanicId]: LevelBase & { mechanic: M; params: MechanicParamsMap[M] };
}[MechanicId];

export interface Track {
  $schema?: string;
  /** Identifiant du parcours (ex. "ms"). */
  id: string;
  /** Nom lisible par le parent (ex. "Moyenne section"). */
  title: string;
  /** Étoiles minimum sur un niveau pour débloquer le suivant (1 à 3, défaut 1). */
  minStarsToUnlockNext?: number;
  /** Identifiants des niveaux, dans l'ordre de la carte. */
  levels: string[];
}

// ---------- Mécaniques (moteur générique ↔ mécanique spécifique) ----------

/** Générateur pseudo-aléatoire déterministe (même graine → mêmes manches). */
export interface Rng {
  /** Réel dans [0, 1). */
  next(): number;
  /** Entier dans [min, max], bornes incluses. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Renvoie une copie mélangée. */
  shuffle<T>(items: readonly T[]): T[];
}

export type ChoiceId = string;

/** Une manche : données d'affichage propres à la mécanique + identifiant de la bonne réponse. */
export interface Round<D = unknown> {
  data: D;
  answer: ChoiceId;
}

export interface MechanicViewProps<D> {
  round: Round<D>;
  /** Choix déjà tentés à tort pendant cette manche : les afficher grisés et non cliquables. */
  wrongChoices: ReadonlySet<ChoiceId>;
  /** Vrai dès que la manche est réussie : jouer l'animation de réussite, ignorer tout nouveau tap. */
  solved: boolean;
  /** À appeler quand l'enfant tape un choix. Le moteur décide si c'est juste. */
  onChoose: (choice: ChoiceId) => void;
}

/**
 * Une mécanique = un générateur de manches + une vue.
 * Règle pour la vue : chaque élément tapable porte l'attribut `data-choice={choiceId}`
 * (utilisé par la main du tutoriel et par les tests de bout en bout).
 */
export interface MechanicDefinition<M extends MechanicId, D = unknown> {
  id: M;
  /** Génère `count` manches, différentes entre elles quand les paramètres le permettent. */
  generateRounds(params: MechanicParamsMap[M], count: number, rng: Rng): Round<D>[];
  View: FunctionComponent<MechanicViewProps<D>>;
  /**
   * Délai (ms) avant de passer à la manche suivante après une bonne réponse. Défaut du moteur : 900 ms.
   * Permet à une mécanique avec sa propre animation de réussite (ex. color-mix) de durer plus longtemps
   * sans que le moteur n'enchaîne trop tôt.
   */
  solvedDelayMs?: number;
  /**
   * Suite de `data-choice` que la main du tutoriel doit taper l'un après l'autre pendant la première
   * manche (ex. color-mix : deux fioles à verser). Défaut du moteur : `[round.answer]`.
   */
  tutorialTargets?(round: Round<D>): ChoiceId[];
}

// ---------- État de la carte ----------

export type LevelStatus = 'locked' | 'unlocked' | 'completed';

export interface LevelState {
  levelId: string;
  status: LevelStatus;
  /** Meilleur nombre d'étoiles obtenu (0 si jamais terminé). */
  bestStars: 0 | 1 | 2 | 3;
  /** Vrai pour le premier niveau débloqué non terminé : c'est « là où on en est » sur la carte. */
  current: boolean;
  /** Vrai si l'état vient d'un réglage manuel du parent. */
  overridden: boolean;
}

// ---------- Statistiques (définitions de référence : docs/ARCHITECTURE.md § Statistiques) ----------

export interface LevelStats {
  levelId: string;
  /** Essais = parties lancées (tous statuts, y compris en cours). */
  runs: number;
  completed: number;
  /** Abandons en cours de niveau : endReason "quit" ou "closed". */
  abandoned: number;
  /** Parties interrompues par le minuteur ou le quota (endReason "time-up") : pas des abandons. */
  interrupted: number;
  /** Rejeux volontaires : parties lancées alors que le niveau était déjà réussi. */
  replays: number;
  /** Manches jouées jusqu'à la bonne réponse, toutes parties confondues. */
  roundsPlayed: number;
  /** Taux de réussite = manches réussies du premier coup / manches jouées ; null si aucune manche. */
  firstTryRate: number | null;
  bestStars: 0 | 1 | 2 | 3;
  /** Temps de jeu cumulé sur ce niveau (somme des durées des manches), en ms. */
  playTimeMs: number;
  lastPlayedAt: number | null;
}
