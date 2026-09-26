// Catalogue des sujets et des supports de « Lis et montre ». Contenu pédagogique : relire avec soin.
import { ANCHOR_RELATIONS } from '../../engine/types';
import type { AnchorId, Relation } from '../../engine/types';

/** Identifiants des sujets du catalogue (littéral, pour un accès sûr par index). */
export const SUBJECT_ID_LIST = [
  'chat',
  'chapeau',
  'champignon',
  'poisson',
  'poussin',
  'pomme',
  'bateau',
  'gateau',
  'chateau',
  'cochon',
  'coq',
  'coccinelle',
  'vache',
  'valise',
  'velo',
  'canard',
  'canape',
  'canoe',
  'mouton',
  'mouche',
  'moto',
  'escargot',
  'abeille',
  'ours',
  'tortue',
] as const;
export type SubjectId = (typeof SUBJECT_ID_LIST)[number];

/** Un sujet illustré (« le lapin »), avec ses formes accordées et ses sosies à l'écrit. */
export interface SubjectEntry {
  id: SubjectId;
  emoji: string;
  gender: 'm' | 'f';
  /** Phrase complète, article inclus, au singulier (ex. « le lapin », « l'escargot »). */
  singular: string;
  /** Phrase complète, article inclus, au pluriel (ex. « les lapins », « les escargots »). */
  plural: string;
  /**
   * Sujets du catalogue dont le mot ressemble à l'œil (mêmes premières lettres, ou une lettre
   * d'écart), à la même place dans une image fausse : lapin/sapin, bateau/gâteau…
   */
  lookAlikes: SubjectId[];
}

// Familles de sosies à l'écrit (trios : chaque sujet a 2 sosies, assez pour 3 images fausses au piège
// "noun" seul). Émojis choisis pour rester reconnaissables sans ambiguïté sur Android.
export const SUBJECTS: Record<SubjectId, SubjectEntry> = {
  // Famille « cha- » : chat / chapeau / champignon.
  chat: {
    id: 'chat',
    emoji: '🐱',
    gender: 'm',
    singular: 'le chat',
    plural: 'les chats',
    lookAlikes: ['chapeau', 'champignon'],
  },
  chapeau: {
    id: 'chapeau',
    emoji: '🎩',
    gender: 'm',
    singular: 'le chapeau',
    plural: 'les chapeaux',
    lookAlikes: ['chat', 'champignon'],
  },
  champignon: {
    id: 'champignon',
    emoji: '🍄',
    gender: 'm',
    singular: 'le champignon',
    plural: 'les champignons',
    lookAlikes: ['chat', 'chapeau'],
  },

  // Famille « po- » : poisson / poussin / pomme.
  poisson: {
    id: 'poisson',
    emoji: '🐟',
    gender: 'm',
    singular: 'le poisson',
    plural: 'les poissons',
    lookAlikes: ['poussin', 'pomme'],
  },
  poussin: {
    id: 'poussin',
    emoji: '🐤',
    gender: 'm',
    singular: 'le poussin',
    plural: 'les poussins',
    lookAlikes: ['poisson', 'pomme'],
  },
  pomme: {
    id: 'pomme',
    emoji: '🍎',
    gender: 'f',
    singular: 'la pomme',
    plural: 'les pommes',
    lookAlikes: ['poisson', 'poussin'],
  },

  // Famille « -âteau » (une lettre d'écart) : bateau / gâteau / château.
  bateau: {
    id: 'bateau',
    emoji: '⛵',
    gender: 'm',
    singular: 'le bateau',
    plural: 'les bateaux',
    lookAlikes: ['gateau', 'chateau'],
  },
  gateau: {
    id: 'gateau',
    emoji: '🎂',
    gender: 'm',
    singular: 'le gâteau',
    plural: 'les gâteaux',
    lookAlikes: ['bateau', 'chateau'],
  },
  chateau: {
    id: 'chateau',
    emoji: '🏰',
    gender: 'm',
    singular: 'le château',
    plural: 'les châteaux',
    lookAlikes: ['bateau', 'gateau'],
  },

  // Famille « coc- » : cochon / coq / coccinelle.
  cochon: {
    id: 'cochon',
    emoji: '🐷',
    gender: 'm',
    singular: 'le cochon',
    plural: 'les cochons',
    lookAlikes: ['coq', 'coccinelle'],
  },
  coq: {
    id: 'coq',
    emoji: '🐓',
    gender: 'm',
    singular: 'le coq',
    plural: 'les coqs',
    lookAlikes: ['cochon', 'coccinelle'],
  },
  coccinelle: {
    id: 'coccinelle',
    emoji: '🐞',
    gender: 'f',
    singular: 'la coccinelle',
    plural: 'les coccinelles',
    lookAlikes: ['cochon', 'coq'],
  },

  // Famille « v- » : vache / valise / vélo.
  vache: {
    id: 'vache',
    emoji: '🐄',
    gender: 'f',
    singular: 'la vache',
    plural: 'les vaches',
    lookAlikes: ['valise', 'velo'],
  },
  valise: {
    id: 'valise',
    emoji: '🧳',
    gender: 'f',
    singular: 'la valise',
    plural: 'les valises',
    lookAlikes: ['vache', 'velo'],
  },
  velo: {
    id: 'velo',
    emoji: '🚲',
    gender: 'm',
    singular: 'le vélo',
    plural: 'les vélos',
    lookAlikes: ['vache', 'valise'],
  },

  // Famille « can- » : canard / canapé / canoë.
  canard: {
    id: 'canard',
    emoji: '🦆',
    gender: 'm',
    singular: 'le canard',
    plural: 'les canards',
    lookAlikes: ['canape', 'canoe'],
  },
  canape: {
    id: 'canape',
    emoji: '🛋️',
    gender: 'm',
    singular: 'le canapé',
    plural: 'les canapés',
    lookAlikes: ['canard', 'canoe'],
  },
  canoe: {
    id: 'canoe',
    emoji: '🛶',
    gender: 'm',
    singular: 'le canoë',
    plural: 'les canoës',
    lookAlikes: ['canard', 'canape'],
  },

  // Famille « mo- » : mouton / mouche / moto (mouche et moustique se confondent à l'image).
  mouton: {
    id: 'mouton',
    emoji: '🐑',
    gender: 'm',
    singular: 'le mouton',
    plural: 'les moutons',
    lookAlikes: ['mouche', 'moto'],
  },
  mouche: {
    id: 'mouche',
    emoji: '🪰',
    gender: 'f',
    singular: 'la mouche',
    plural: 'les mouches',
    lookAlikes: ['mouton', 'moto'],
  },
  moto: {
    id: 'moto',
    emoji: '🏍️',
    gender: 'f',
    singular: 'la moto',
    plural: 'les motos',
    lookAlikes: ['mouton', 'mouche'],
  },

  // Sujets supplémentaires : diversité de genre et d'élision, sans sosie dédié.
  escargot: {
    id: 'escargot',
    emoji: '🐌',
    gender: 'm',
    singular: "l'escargot",
    plural: 'les escargots',
    lookAlikes: [],
  },
  abeille: {
    id: 'abeille',
    emoji: '🐝',
    gender: 'f',
    singular: "l'abeille",
    plural: 'les abeilles',
    lookAlikes: [],
  },
  ours: { id: 'ours', emoji: '🐻', gender: 'm', singular: "l'ours", plural: 'les ours', lookAlikes: [] },
  tortue: {
    id: 'tortue',
    emoji: '🐢',
    gender: 'f',
    singular: 'la tortue',
    plural: 'les tortues',
    lookAlikes: [],
  },
};

/** Un support et sa description grammaticale (genre, élision) pour construire les phrases. */
export interface AnchorEntry {
  id: AnchorId;
  emoji: string;
  gender: 'm' | 'f';
  /** Vrai si le nom commence par une voyelle (élision : « l'arbre »). */
  elided: boolean;
  /** Nom nu, sans article (ex. « table », « lit », « arbre »). */
  noun: string;
}

export const ANCHORS: Record<AnchorId, AnchorEntry> = {
  table: { id: 'table', emoji: '🟫', gender: 'f', elided: false, noun: 'table' },
  chair: { id: 'chair', emoji: '🪑', gender: 'f', elided: false, noun: 'chaise' },
  box: { id: 'box', emoji: '📦', gender: 'f', elided: false, noun: 'boîte' },
  bed: { id: 'bed', emoji: '🛏️', gender: 'm', elided: false, noun: 'lit' },
  tree: { id: 'tree', emoji: '🌳', gender: 'm', elided: true, noun: 'arbre' },
};

const RELATION_WORDS: Record<Relation, string> = {
  on: 'sur',
  under: 'sous',
  beside: 'à côté',
  'in-front': 'devant',
};

/** « le »/« la »/« l' » devant le nom du support. */
function determiner(anchor: AnchorEntry): string {
  return anchor.elided ? "l'" : anchor.gender === 'f' ? 'la ' : 'le ';
}

/** « du »/« de la »/« de l' » devant le nom du support (contraction après « à côté »). */
function deDeterminer(anchor: AnchorEntry): string {
  return anchor.elided ? "de l'" : anchor.gender === 'f' ? 'de la ' : 'du ';
}

/** Construit « sur la table », « à côté du lit », « devant l'arbre »… */
export function anchorPhrase(anchorId: AnchorId, relation: Relation): string {
  const anchor = ANCHORS[anchorId];
  if (relation === 'beside') return `à côté ${deDeterminer(anchor)}${anchor.noun}`;
  return `${RELATION_WORDS[relation]} ${determiner(anchor)}${anchor.noun}`;
}

/** Phrase du sujet, article inclus, accordée au nombre demandé. */
export function subjectPhrase(subjectId: SubjectId, count: 1 | 3): string {
  const entry = SUBJECTS[subjectId];
  return count === 1 ? entry.singular : entry.plural;
}

/** Majuscule initiale, en respectant une apostrophe d'élision (« l'escargot » → « L'escargot »). */
export function capitalize(text: string): string {
  return text.length === 0 ? text : (text[0] as string).toUpperCase() + text.slice(1);
}

/** Relations utilisables sur ce support, restreintes à celles autorisées par les paramètres du niveau. */
export function usableRelations(anchor: AnchorId, allowed: readonly Relation[]): Relation[] {
  return (ANCHOR_RELATIONS[anchor] as readonly Relation[]).filter((r) => allowed.includes(r));
}

export const ANCHOR_IDS: AnchorId[] = Object.keys(ANCHOR_RELATIONS) as AnchorId[];
export const SUBJECT_IDS: SubjectId[] = SUBJECT_ID_LIST.slice();
