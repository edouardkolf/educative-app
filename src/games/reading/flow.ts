// Enchaînement d'une séance de lecture : machine d'état PURE de la file de questions et fabrication des
// `ReadingAnswer`. Aucun effet (ni voix, ni son, ni stockage, ni minuteur) : l'écran les exécute
// (`useQuestionFlow.ts`) ; ici on décide seulement ce qui est enregistré et dans quel ordre on pose les questions.
import { requeueAfterMiss } from './session';
import type {
  ReadingAnswer,
  ReadingChoice,
  ReadingGameId,
  ReadingQuestion,
  ReadingSessionPlan,
} from './types';

/** `choiceCount` enregistré pour le tambour (LECTURE.md §4 : hasard = 1 / 3). */
export const DRUM_CHOICE_COUNT = 3;
/** Identifiant du seul « choix » du tambour (`data-choice`). */
export const DRUM_CHOICE = 'drum';

/** Fonction de remise en file (injectable pour les tests). */
export type Requeue = (queue: readonly ReadingQuestion[], index: number) => ReadingQuestion[];

export interface FlowState {
  /** File courante : questions prévues, exemples guidés remis en fin de file, questions reposées. */
  queue: readonly ReadingQuestion[];
  /** Position de la question en cours dans `queue` (= `queue.length` quand tout est joué). */
  index: number;
  /** Nombre de questions prévues par la séance (points d'avancement). */
  planned: number;
  /** Jeux dont la démonstration reste à faire. */
  pendingDemos: readonly ReadingGameId[];
  /** Jeux dont la démonstration a été faite pendant cette séance. */
  demosDone: readonly ReadingGameId[];
  /** Premières tentatives, dans l'ordre (reposées comprises). */
  answers: readonly ReadingAnswer[];
  /** Questions (objets de la file) reposées après une erreur : quand on les rejoue, la réponse est `retry`. */
  retries: readonly ReadingQuestion[];
}

export function initFlow(plan: ReadingSessionPlan): FlowState {
  return {
    queue: [...plan.questions],
    index: 0,
    planned: plan.questions.length,
    pendingDemos: [...plan.demos],
    demosDone: [],
    answers: [],
    retries: [],
  };
}

export function currentQuestion(state: FlowState): ReadingQuestion | null {
  return state.queue[state.index] ?? null;
}

/** Tout est joué (ou la file est vide). */
export function isFlowOver(state: FlowState): boolean {
  return state.index >= state.queue.length;
}

/** La question en cours est la première de son jeu et la démonstration de ce jeu reste à faire. */
export function isDemoTurn(state: FlowState): boolean {
  const q = currentQuestion(state);
  return q !== null && state.pendingDemos.includes(q.game);
}

/**
 * La question en cours est une question reposée : sa réponse ne compte pas dans la maîtrise. À évaluer au DÉBUT
 * d'un tour (avant la première tentative) : la copie reposée peut être le même objet que l'original.
 */
export function isRetryTurn(state: FlowState): boolean {
  const q = currentQuestion(state);
  return q !== null && state.retries.includes(q);
}

/**
 * Fin de l'exemple guidé : non enregistré, le jeu passe dans `demosDone`, la même question est remise en fin
 * de file (elle sera jouée normalement) et on passe à la suivante.
 */
export function completeDemo(state: FlowState): FlowState {
  const q = currentQuestion(state);
  if (!q) return state;
  return {
    ...state,
    queue: [...state.queue, q],
    index: state.index + 1,
    pendingDemos: state.pendingDemos.filter((g) => g !== q.game),
    demosDone: state.demosDone.includes(q.game) ? state.demosDone : [...state.demosDone, q.game],
  };
}

/**
 * Première tentative sur la question en cours. Une erreur du premier coup fait reposer la question plus tard
 * (une seule fois : une question déjà reposée n'est pas remise en file).
 */
export function recordFirstAttempt(
  state: FlowState,
  answer: ReadingAnswer,
  requeue: Requeue = requeueAfterMiss,
): FlowState {
  const answers = [...state.answers, answer];
  if (answer.correct || answer.retry) return { ...state, answers };
  const old = state.queue;
  const queue = requeue(old, state.index);
  // La copie insérée est la première question qui diffère de l'ancienne file après la position courante.
  const inserted = queue.find((q, i) => i > state.index && q !== old[i]);
  const current = old[state.index];
  const marked = inserted ?? current;
  return {
    ...state,
    queue,
    answers,
    retries: marked ? [...state.retries, marked] : state.retries,
  };
}

/** Question suivante (après une bonne réponse, une fois la félicitation dite). */
export function nextQuestion(state: FlowState): FlowState {
  return { ...state, index: state.index + 1 };
}

/** Points d'avancement : un par question prévue, remplis à chaque première réponse (reposées exclues). */
export function dotsProgress(state: FlowState): { total: number; done: number } {
  const done = state.answers.filter((a) => !a.retry).length;
  return { total: state.planned, done: Math.min(done, state.planned) };
}

/** Réponses comptées pour la maîtrise (hors questions reposées). */
export function countedAnswers(answers: readonly ReadingAnswer[]): ReadingAnswer[] {
  return answers.filter((a) => !a.retry);
}

export interface AttemptInfo {
  question: ReadingQuestion;
  /** Choix touché (ou nombre de frappes pour le tambour). */
  chosen: string;
  /** Appuis sur le haut-parleur avant cette première tentative. */
  replays: number;
  hinted: boolean;
  retry: boolean;
  /** Instant où les choix sont devenus tapables (fin de la consigne), en ms. */
  readyAt: number;
  now: number;
}

export function buildAnswer(info: AttemptInfo): ReadingAnswer {
  const { question, chosen } = info;
  const correct = chosen === question.answer;
  return {
    itemId: question.itemId,
    game: question.game,
    target: question.target,
    correct,
    chosen: correct ? null : chosen,
    choiceCount: question.game === 'syllable-drum' ? DRUM_CHOICE_COUNT : question.choices.length,
    replays: info.replays,
    hinted: info.hinted,
    retry: info.retry,
    ms: Math.max(0, Math.round(info.now - info.readyAt)),
    at: info.now,
  };
}

/** `data-choice` que la main animée doit toucher dans l'exemple guidé (le tambour : `answer` frappes). */
export function guidedTargets(question: ReadingQuestion): string[] {
  if (question.game === 'syllable-drum') {
    const n = Math.max(1, Math.min(4, Number.parseInt(question.answer, 10) || 1));
    return Array.from({ length: n }, () => DRUM_CHOICE);
  }
  return [question.answer];
}

/** Ce que dit la voix quand l'enfant touche un choix faux : « la lettre touchée chante son propre son ». */
export type ChoiceSound = { type: 'grapheme'; id: string } | { type: 'syllable'; id: string };

export function soundOfChoice(choice: ReadingChoice | undefined): ChoiceSound | null {
  if (!choice) return null;
  const id = (choice.label ?? choice.id).toLowerCase();
  if (choice.kind === 'letter') return { type: 'grapheme', id };
  if (choice.kind === 'syllable') return { type: 'syllable', id };
  return null;
}
