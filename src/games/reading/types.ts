// CONTRAT — « J'apprends à lire » (docs/specs/LECTURE.md). Types partagés par le contenu, la logique,
// l'écran, les vues de jeu, le stockage et les statistiques. On le modifie volontairement, jamais en passant.
import type { SpeechStep } from '../../ui/voice';

/** Les cinq étapes du programme (LECTURE.md §3). */
export type ReadingStage = 1 | 2 | 3 | 4 | 5;
export const READING_STAGES: readonly ReadingStage[] = [1, 2, 3, 4, 5];

/** Les huit jeux (LECTURE.md §4). */
export const READING_GAMES = [
  'syllable-drum', // taper une fois par syllabe
  'same-start', // qui commence pareil ?
  'same-end', // qui finit pareil ? (rime)
  'letter-sound', // la lettre qui chante : son → lettre
  'first-sound', // par quoi ça commence ? image → lettre
  'syllable-machine', // fusion : syllabe entendue → syllabe écrite
  'mystery-word', // mot écrit → image
  'letter-twins', // capitale → minuscule
] as const;
export type ReadingGameId = (typeof READING_GAMES)[number];

// ---------- Contenu ----------

/** Identifiant d'un graphème, en minuscules : 'a', 'é', 'l', 'ou', 'ch', 'on'… */
export type GraphemeId = string;
export type GraphemeKind = 'vowel' | 'long' | 'short' | 'digraph' | 'rare' | 'bonus';

export interface Grapheme {
  id: GraphemeId;
  /** Capitales affichées à l'enfant : 'A', 'É', 'OU', 'CH'. */
  upper: string;
  /** Minuscules scriptes (jeu des jumelles) : 'a', 'é', 'ou', 'ch'. */
  lower: string;
  stage: ReadingStage;
  /** Rang d'introduction dans tout le programme (1 = A). Unique. */
  order: number;
  kind: GraphemeKind;
  /** false : simple familiarisation (lettres rares, bonus), ne bloque jamais le passage d'étape. */
  gated: boolean;
  /** Image du mot repère (son au début du mot), ou null. */
  keyword: PictureId | null;
}

/** Identifiant d'une image du catalogue lecture (src/games/reading/pictures.ts). */
export type PictureId = string;

export interface Picture {
  id: PictureId;
  emoji: string;
  /** Mot dit par la voix, sans article : « lapin ». */
  word: string;
  article: 'un' | 'une' | null;
  /** Syllabes ORALES (ce qu'on tape au tambour) : ['la', 'pin'], ['ba', 'nane'], ['chat']. 1 à 3. */
  syllables: readonly string[];
  /** Graphème du premier son, s'il est au programme : 'l' pour lapin. Sinon null. */
  firstSound: GraphemeId | null;
  /** Clé de rime (dernier son vocalique + suite), libre mais identique pour les mots qui riment : 'o'. */
  rhyme: string;
}

/** Syllabe consonne + voyelle de la machine à syllabes. */
export interface Syllable {
  /** 'la', 'mi', 'chou'… = concaténation des deux graphèmes. */
  id: string;
  onset: GraphemeId;
  vowel: GraphemeId;
  /** Image d'un mot qui commence par cette syllabe (LA comme LAMA), ou null. */
  picture: PictureId | null;
}

/** Mot entièrement déchiffrable de l'étape 5. */
export interface ReadWord {
  id: string;
  /** En capitales : 'MOTO'. */
  text: string;
  /** Découpage affiché quand l'enfant hésite : ['MO', 'TO']. */
  syllables: readonly string[];
  picture: PictureId;
}

// ---------- Items de maîtrise ----------

/** Compétences suivies comme un item (règle 8 sur 10, LECTURE.md §5.2). */
export const READING_SKILLS = ['count', 'onset', 'rhyme', 'blend', 'blend-stop', 'read', 'case'] as const;
export type ReadingSkill = (typeof READING_SKILLS)[number];

/** Unité de maîtrise : `g:<graphemeId>` (un graphème) ou `k:<skill>` (une compétence). */
export type ItemId = `g:${string}` | `k:${ReadingSkill}`;
export type ItemState = 'new' | 'learning' | 'acquired';

export interface ItemProgress {
  state: ItemState;
  /** Réponses comptées (une par question, la première tentative). */
  seen: number;
  /** Dont justes du premier coup. */
  correct: number;
  /** Bonnes réponses d'affilée en cours (0 après une erreur). */
  streak: number;
  /** Erreurs d'affilée en cours. */
  missStreak: number;
  /** Jours locaux (AAAA-MM-JJ) des bonnes réponses de la série en cours. */
  streakDays: readonly string[];
  lastSeenAt: number | null;
}

export interface ReadingProgress {
  /** Étape en cours (la plus haute débloquée). */
  stage: ReadingStage;
  /** Les cinq étapes sont validées. */
  finished: boolean;
  /** Tous les items du programme, y compris ceux jamais vus (`state: 'new'`). */
  items: Readonly<Record<string, ItemProgress>>;
  /** Jeux dont la démonstration a déjà été faite. */
  demosDone: readonly ReadingGameId[];
  /** Séances terminées, toutes étapes. */
  sessionsCompleted: number;
}

// ---------- Questions et séances ----------

export type ChoiceKind = 'letter' | 'lower' | 'syllable' | 'picture' | 'word';

export interface ReadingChoice {
  /** Valeur envoyée à `onChoose`, unique dans la question (`data-choice`). */
  id: string;
  kind: ChoiceKind;
  /** Texte affiché (lettre, syllabe, mot) ; absent pour une image. */
  label?: string;
  /** Image affichée (kind 'picture'). */
  picture?: PictureId;
  /** Ce que la voix dit quand elle énumère les choix (jeux d'écoute), sinon absent. */
  speech?: string;
}

export type ReadingStimulus =
  | { kind: 'sound'; grapheme: GraphemeId } // rien d'écrit : un haut-parleur
  | { kind: 'picture'; picture: PictureId }
  | { kind: 'syllable'; syllable: string; parts: readonly [string, string] } // parts en capitales : ['L', 'A']
  | { kind: 'word'; word: string; syllables: readonly string[] } // en capitales
  | { kind: 'letter'; grapheme: GraphemeId }; // capitale affichée

export interface ReadingQuestion {
  game: ReadingGameId;
  itemId: ItemId;
  /** Ce qui est demandé précisément (statistiques, table de confusions) : 'm', 'la', 'moto', 'lapin'… */
  target: string;
  stimulus: ReadingStimulus;
  /** Vide pour `syllable-drum` (réponse = nombre de frappes, '1' à '4'). */
  choices: readonly ReadingChoice[];
  /** Id du bon choix, ou le bon nombre de syllabes en chaîne ('2'). */
  answer: string;
  /** Consigne et stimulus parlés, joués à l'arrivée de la question et par le bouton haut-parleur. */
  prompt: readonly SpeechStep[];
  /** true : après la consigne, la voix énumère les choix (`choice.speech`) en les mettant en avant. */
  speakChoices: boolean;
  /** Dit après une bonne réponse (ex. « la, comme lama »), ou vide. */
  praise: readonly SpeechStep[];
  /** L'item est présenté pour la première fois dans cette séance. */
  isNew: boolean;
}

export interface ReadingSessionPlan {
  stage: ReadingStage;
  /** 8 à 10 questions. */
  questions: readonly ReadingQuestion[];
  /** Item introduit par cette séance (un seul au plus). */
  newItemId: ItemId | null;
  /** Jeux de la séance dont la démonstration reste à faire, dans l'ordre d'apparition. */
  demos: readonly ReadingGameId[];
}

// ---------- Enregistrements (store "readings") ----------

/** Une réponse = la PREMIÈRE tentative sur une question (les essais suivants ne comptent pas). */
export interface ReadingAnswer {
  itemId: ItemId;
  game: ReadingGameId;
  target: string;
  /** Juste du premier coup. */
  correct: boolean;
  /** Premier choix faux (id du choix), ou null si juste du premier coup. */
  chosen: string | null;
  /** Nombre de choix proposés (hasard : 1 / choiceCount) ; 3 pour le tambour (1, 2 ou 3 syllabes). */
  choiceCount: number;
  /** Appuis sur le haut-parleur avant la première tentative. */
  replays: number;
  /** La relance (bonne réponse qui clignote) s'est déclenchée avant la première tentative. */
  hinted: boolean;
  /** Question reposée après une erreur dans la même séance : ne compte pas dans la maîtrise. */
  retry: boolean;
  /** Durée entre la fin de la consigne et la première tentative (ms). */
  ms: number;
  at: number;
}

// ---------- Vues de jeu ----------

/** Props communes aux huit vues (src/games/reading/views/). Une vue ne parle pas, ne sonne pas, n'écrit rien. */
export interface ReadingViewProps {
  question: ReadingQuestion;
  /** Choix faux déjà tentés (grisés, non tapables). */
  wrongChoices: readonly string[];
  /** Bonne réponse donnée : la vue fête et n'accepte plus rien. */
  solved: boolean;
  /** Relance : ce choix clignote doucement (ou null). Pour le tambour : le tambour pulse `answer` fois. */
  hintChoice: string | null;
  /** Choix en cours d'énumération par la voix (mis en avant), ou null. */
  spokenChoice: string | null;
  /** Exemple guidé : seul le bon choix réagit. */
  guided: boolean;
  /** La consigne est en cours : les choix sont visibles mais pas encore tapables. */
  disabled: boolean;
  onChoose: (choiceId: string) => void;
  /**
   * Toucher l'image modèle (ou le haut-parleur de « la lettre qui chante ») : la voix répète le mot ou le son,
   * sans rien valider. Les choix de réponse, eux, ne font jamais répéter : toucher un choix = répondre.
   */
  onReplayModel: () => void;
}
