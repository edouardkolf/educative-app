// Logique pure des vues de lecture (testée dans logic.test.ts) : états des choix, compteur du tambour,
// calendrier de la relance du mot mystère. Aucune dépendance au DOM.
import type { ReadingViewProps } from "../types";

export type ChoiceStateProps = Pick<
  ReadingViewProps,
  | "question"
  | "wrongChoices"
  | "solved"
  | "hintChoice"
  | "spokenChoice"
  | "guided"
  | "disabled"
>;

export interface ChoiceFlags {
  /** Choix faux déjà tenté : grisé. */
  wrong: boolean;
  /** Bonne réponse donnée : fête. */
  correct: boolean;
  /** Relance : clignote doucement. */
  hint: boolean;
  /** Énuméré par la voix : mis en avant. */
  spoken: boolean;
  /** Consigne en cours : visible mais « en attente » (pas grisé comme une erreur). */
  waiting: boolean;
  /** Exemple guidé : ce choix n'est pas celui qui réagit. */
  off: boolean;
  /** Bonne réponse donnée et ce choix n'est pas la réponse. */
  dimmed: boolean;
  /** Un tap sur ce choix ne fait rien. */
  inert: boolean;
}

export function choiceFlags(props: ChoiceStateProps, id: string): ChoiceFlags {
  const {
    question,
    wrongChoices,
    solved,
    hintChoice,
    spokenChoice,
    guided,
    disabled,
  } = props;
  const isAnswer = id === question.answer;
  const correct = solved && isAnswer;
  const wrong = !correct && wrongChoices.includes(id);
  const off = guided && !solved && !isAnswer;
  const waiting = disabled && !solved && !wrong;
  return {
    wrong,
    correct,
    hint: hintChoice === id && !solved && !wrong,
    spoken: spokenChoice === id,
    waiting,
    off,
    dimmed: solved && !isAnswer && !wrong,
    inert: solved || disabled || wrong || off,
  };
}

// ---------- Tambour ----------

export const DRUM_MAX_TAPS = 4;
export const DRUM_VALIDATE_MS = 2000;
export const DRUM_PULSE_GAP_MS = 650;

/** Frappe suivante : 4 au plus, les frappes en trop ne comptent pas. */
export function addTap(taps: number): number {
  return Math.min(taps + 1, DRUM_MAX_TAPS);
}

/** Instants (ms) des pulsations de relance : le tambour pulse `answer` fois en rythme. */
export function drumPulseTimes(
  answer: string,
  gapMs: number = DRUM_PULSE_GAP_MS,
): number[] {
  const n = Math.max(
    0,
    Math.min(DRUM_MAX_TAPS, Math.floor(Number(answer)) || 0),
  );
  return Array.from({ length: n }, (_, i) => i * gapMs);
}

// ---------- Mot mystère ----------

export interface MysteryHintStep {
  /** Instant (ms) où la syllabe `index` s'allume. */
  at: number;
  index: number;
}

export interface MysteryHintTimeline {
  steps: MysteryHintStep[];
  /** Instant (ms) où l'image réponse se met à clignoter (après `passes` passages complets). */
  blinkAt: number;
}

/** Les syllabes s'allument une à une, `passes` fois ; ensuite seulement la réponse clignote. */
export function mysteryHintTimeline(
  syllableCount: number,
  passes = 2,
  stepMs = 650,
): MysteryHintTimeline {
  const n = Math.max(1, syllableCount);
  const total = n * passes;
  const steps = Array.from({ length: total }, (_, i) => ({
    at: i * stepMs,
    index: i % n,
  }));
  return { steps, blinkAt: total * stepMs };
}

/** Corps du mot (en unités de vue ; 1 unité = 1 % de la largeur) : le mot le plus long doit tenir. */
export function wordFontUnits(letters: number): number {
  return Math.min(26, 80 / (Math.max(1, letters) * 0.72));
}
