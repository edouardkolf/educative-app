// Machine d'état de la dictée (docs/specs/DICTEE.md §3.6). Pure : ni DOM, ni stockage, ni horloge
// (`now` arrive dans les actions). L'écran exécute les effets.
import { isCorrectAnswer, normalizeAnswer } from './answer';
import { KEYBOARD_CHARS, MAX_ANSWER_LENGTH } from './keyboard-layout';
import type { DictationItem, DictationPlannedWord } from '../../storage/dictations';

export type DictationPhase = 'choose' | 'word' | 'copy' | 'solved' | 'end';

export interface DictationUnit {
  shownAt: number;
  answerMs: number | null;
  pausedMs: number;
  hiddenSince: number | null;
  wordReplays: number;
  sentenceReplays: number;
  copyMistakes: number;
}

export interface DictationState {
  phase: DictationPhase;
  seriesId: string | null;
  seed: number;
  startedAt: number;
  words: DictationPlannedWord[];
  expected: string[];
  index: number;
  typed: string;
  firstAttempt: string | null;
  items: DictationItem[]; // triés par index
  unit: DictationUnit;
}

export type DictationAction =
  | { type: 'start'; seriesId: string; seed: number; words: DictationPlannedWord[]; expected: string[]; now: number }
  | { type: 'key'; char: string; now: number }
  | { type: 'erase' }
  | { type: 'validate'; now: number }
  | { type: 'replay'; what: 'word' | 'sentence' }
  | { type: 'next'; now: number }
  | { type: 'visibility'; hidden: boolean; now: number };

export type DictationEffect =
  | { kind: 'speak'; what: 'intro' | 'word' | 'sentence' }
  | { kind: 'sound'; what: 'success' | 'error' }
  | { kind: 'save'; item: DictationItem }
  | { kind: 'next-after'; ms: number }
  | { kind: 'finished' };

type StepResult = { state: DictationState; effects: DictationEffect[] };

/** État de départ, avant tout tirage (phase `choose`). Pratique pour l'écran, avant le premier `start`. */
export function createInitialState(): DictationState {
  return {
    phase: 'choose',
    seriesId: null,
    seed: 0,
    startedAt: 0,
    words: [],
    expected: [],
    index: 0,
    typed: '',
    firstAttempt: null,
    items: [],
    unit: freshUnit(0),
  };
}

function freshUnit(now: number): DictationUnit {
  return {
    shownAt: now,
    answerMs: null,
    pausedMs: 0,
    hiddenSince: null,
    wordReplays: 0,
    sentenceReplays: 0,
    copyMistakes: 0,
  };
}

function ignore(s: DictationState): StepResult {
  return { state: s, effects: [] };
}

/** Remplace l'item de même `index` (ou l'ajoute), puis trie par `index`. */
function withItem(items: DictationItem[], item: DictationItem): DictationItem[] {
  const next = items.filter((i) => i.index !== item.index);
  next.push(item);
  next.sort((a, b) => a.index - b.index);
  return next;
}

function buildItem(
  s: DictationState,
  opts: { typed: string; firstTry: boolean; copyDone: boolean; copyMistakes: number; answerMs: number; durationMs: number },
): DictationItem {
  const planned = s.words[s.index];
  return {
    index: s.index,
    wordId: planned?.wordId ?? '',
    expected: s.expected[s.index] ?? '',
    typed: opts.typed,
    firstTry: opts.firstTry,
    copyDone: opts.copyDone,
    copyMistakes: opts.copyMistakes,
    wordReplays: s.unit.wordReplays,
    sentenceReplays: s.unit.sentenceReplays,
    answerMs: opts.answerMs,
    durationMs: opts.durationMs,
  };
}

function activeMsSince(unit: DictationUnit, now: number): number {
  return Math.max(0, now - unit.shownAt - unit.pausedMs);
}

function startNextWord(s: DictationState, now: number): StepResult {
  const finishedCount = s.items.length;
  if (finishedCount >= s.words.length) {
    return { state: { ...s, phase: 'end' }, effects: [{ kind: 'finished' }] };
  }
  const state: DictationState = {
    ...s,
    phase: 'word',
    index: finishedCount,
    typed: '',
    firstAttempt: null,
    unit: freshUnit(now),
  };
  return { state, effects: [{ kind: 'speak', what: 'intro' }] };
}

export function step(s: DictationState, a: DictationAction): StepResult {
  switch (a.type) {
    case 'start': {
      if (s.phase !== 'choose' && s.phase !== 'end') return ignore(s);
      const state: DictationState = {
        phase: 'word',
        seriesId: a.seriesId,
        seed: a.seed,
        startedAt: a.now,
        words: a.words,
        expected: a.expected,
        index: 0,
        typed: '',
        firstAttempt: null,
        items: [],
        unit: freshUnit(a.now),
      };
      return { state, effects: [{ kind: 'speak', what: 'intro' }] };
    }

    case 'key': {
      if (s.phase === 'word') {
        if (!KEYBOARD_CHARS.has(a.char)) return ignore(s);
        if (s.typed.length >= MAX_ANSWER_LENGTH) return ignore(s);
        return { state: { ...s, typed: s.typed + a.char }, effects: [] };
      }
      if (s.phase === 'copy') {
        const expectedChars = Array.from(normalizeAnswer(s.expected[s.index] ?? ''));
        const position = s.typed.length;
        const expectedChar = expectedChars[position];
        if (expectedChar === undefined) return ignore(s);
        if (normalizeAnswer(a.char) !== expectedChar) {
          return {
            state: { ...s, unit: { ...s.unit, copyMistakes: s.unit.copyMistakes + 1 } },
            effects: [],
          };
        }
        const typed = s.typed + expectedChar;
        if (typed.length < expectedChars.length) {
          return { state: { ...s, typed }, effects: [] };
        }
        // Mot complet.
        const durationMs = activeMsSince(s.unit, a.now);
        const answerMs = s.unit.answerMs ?? durationMs;
        const item = buildItem(s, {
          typed: normalizeAnswer(s.firstAttempt ?? ''),
          firstTry: false,
          copyDone: true,
          copyMistakes: s.unit.copyMistakes,
          answerMs,
          durationMs,
        });
        const state: DictationState = {
          ...s,
          phase: 'solved',
          typed,
          items: withItem(s.items, item),
          unit: { ...s.unit, answerMs },
        };
        return {
          state,
          effects: [{ kind: 'sound', what: 'success' }, { kind: 'save', item }, { kind: 'next-after', ms: 900 }],
        };
      }
      return ignore(s);
    }

    case 'erase': {
      if (s.phase !== 'word') return ignore(s);
      if (s.typed.length === 0) return ignore(s);
      return { state: { ...s, typed: s.typed.slice(0, -1) }, effects: [] };
    }

    case 'validate': {
      if (s.phase !== 'word') return ignore(s);
      if (s.typed.length === 0) return ignore(s);

      const expected = s.expected[s.index] ?? '';
      const durationMs = activeMsSince(s.unit, a.now);

      if (isCorrectAnswer(s.typed, expected)) {
        const item = buildItem(s, {
          typed: normalizeAnswer(s.typed),
          firstTry: true,
          copyDone: true,
          copyMistakes: 0,
          answerMs: durationMs,
          durationMs,
        });
        const state: DictationState = {
          ...s,
          phase: 'solved',
          items: withItem(s.items, item),
          unit: { ...s.unit, answerMs: durationMs },
        };
        return {
          state,
          effects: [{ kind: 'sound', what: 'success' }, { kind: 'save', item }, { kind: 'next-after', ms: 1200 }],
        };
      }

      const item = buildItem(s, {
        typed: normalizeAnswer(s.typed),
        firstTry: false,
        copyDone: false,
        copyMistakes: 0,
        answerMs: durationMs,
        durationMs,
      });
      const state: DictationState = {
        ...s,
        phase: 'copy',
        firstAttempt: s.typed,
        typed: '',
        items: withItem(s.items, item),
        unit: { ...s.unit, answerMs: durationMs },
      };
      return {
        state,
        effects: [{ kind: 'sound', what: 'error' }, { kind: 'speak', what: 'word' }, { kind: 'save', item }],
      };
    }

    case 'replay': {
      if (s.phase !== 'word' && s.phase !== 'copy') return ignore(s);
      if (a.what === 'word') {
        return {
          state: { ...s, unit: { ...s.unit, wordReplays: s.unit.wordReplays + 1 } },
          effects: [{ kind: 'speak', what: 'word' }],
        };
      }
      return {
        state: { ...s, unit: { ...s.unit, sentenceReplays: s.unit.sentenceReplays + 1 } },
        effects: [{ kind: 'speak', what: 'sentence' }],
      };
    }

    case 'next': {
      if (s.phase !== 'solved') return ignore(s);
      return startNextWord(s, a.now);
    }

    case 'visibility': {
      if (a.hidden) {
        return { state: { ...s, unit: { ...s.unit, hiddenSince: a.now } }, effects: [] };
      }
      if (s.unit.hiddenSince === null) return ignore(s);
      const pausedMs = s.unit.pausedMs + (a.now - s.unit.hiddenSince);
      return { state: { ...s, unit: { ...s.unit, pausedMs, hiddenSince: null } }, effects: [] };
    }

    default:
      return ignore(s);
  }
}

export const isComplete = (s: DictationState): boolean => s.words.length > 0 && s.items.length === s.words.length;
export const unitInProgress = (s: DictationState): boolean => s.phase === 'word' || s.phase === 'copy';
