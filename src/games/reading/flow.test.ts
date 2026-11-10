import { describe, expect, it } from 'vitest';
import {
  buildAnswer,
  completeDemo,
  countedAnswers,
  currentQuestion,
  dotsProgress,
  guidedTargets,
  initFlow,
  isDemoTurn,
  isFlowOver,
  isRetryTurn,
  nextQuestion,
  recordFirstAttempt,
  soundOfChoice,
  type Requeue,
} from './flow';
import type { ReadingChoice, ReadingGameId, ReadingQuestion, ReadingSessionPlan } from './types';

function question(game: ReadingGameId, target: string, answer = 'a'): ReadingQuestion {
  return {
    game,
    itemId: `g:${target}`,
    target,
    stimulus: { kind: 'sound', grapheme: target },
    choices: [
      { id: 'a', kind: 'letter', label: 'A' },
      { id: 'b', kind: 'letter', label: 'B' },
      { id: 'c', kind: 'letter', label: 'C' },
    ],
    answer,
    prompt: [],
    speakChoices: false,
    praise: [],
    isNew: false,
  };
}

function plan(questions: ReadingQuestion[], demos: ReadingGameId[] = []): ReadingSessionPlan {
  return { stage: 2, questions, newItemId: null, demos };
}

/** Remise en file de test : copie la question 2 places plus loin, ou en dernier. */
const fakeRequeue: Requeue = (queue, index) => {
  const copy = [...queue];
  const q = queue[index] as ReadingQuestion;
  copy.splice(Math.min(index + 3, copy.length), 0, q);
  return copy;
};

const q1 = question('letter-sound', 'a');
const q2 = question('first-sound', 'i');
const q3 = question('letter-sound', 'o');

function answerFor(q: ReadingQuestion, chosen: string, retry = false, now = 10_000) {
  return buildAnswer({ question: q, chosen, replays: 1, hinted: false, retry, readyAt: now - 1200, now });
}

describe('buildAnswer', () => {
  it('juste du premier coup : chosen est null', () => {
    const a = answerFor(q1, 'a');
    expect(a).toMatchObject({ correct: true, chosen: null, choiceCount: 3, replays: 1, hinted: false, retry: false, ms: 1200, at: 10_000 });
    expect(a.itemId).toBe('g:a');
    expect(a.game).toBe('letter-sound');
  });

  it('fausse : chosen est le premier choix faux', () => {
    const a = answerFor(q1, 'b');
    expect(a.correct).toBe(false);
    expect(a.chosen).toBe('b');
  });

  it('le tambour compte 3 choix et ms ne devient jamais négatif', () => {
    const drum: ReadingQuestion = { ...q1, game: 'syllable-drum', choices: [], answer: '2' };
    const a = buildAnswer({ question: drum, chosen: '2', replays: 0, hinted: true, retry: false, readyAt: 5000, now: 4000 });
    expect(a.choiceCount).toBe(3);
    expect(a.ms).toBe(0);
    expect(a.hinted).toBe(true);
  });
});

describe('file de questions', () => {
  it('rejoue dans l\'ordre et se termine', () => {
    let s = initFlow(plan([q1, q2]));
    expect(currentQuestion(s)).toBe(q1);
    s = recordFirstAttempt(s, answerFor(q1, 'a'), fakeRequeue);
    s = nextQuestion(s);
    expect(currentQuestion(s)).toBe(q2);
    s = recordFirstAttempt(s, answerFor(q2, 'a'), fakeRequeue);
    expect(isFlowOver(s)).toBe(false);
    s = nextQuestion(s);
    expect(isFlowOver(s)).toBe(true);
    expect(currentQuestion(s)).toBeNull();
    expect(dotsProgress(s)).toEqual({ total: 2, done: 2 });
  });

  it('une erreur du premier coup repose la question, marquée retry, et une seule fois', () => {
    let s = initFlow(plan([q1, q2]));
    s = recordFirstAttempt(s, answerFor(q1, 'b'), fakeRequeue);
    expect(s.queue).toHaveLength(3);
    expect(s.answers).toHaveLength(1);
    s = nextQuestion(s);
    s = recordFirstAttempt(s, answerFor(q2, 'a'), fakeRequeue);
    s = nextQuestion(s);
    expect(currentQuestion(s)).toBe(q1);
    expect(isRetryTurn(s)).toBe(true);
    // Rate encore : réponse retry, pas de seconde remise en file.
    s = recordFirstAttempt(s, answerFor(q1, 'c', true), fakeRequeue);
    expect(s.queue).toHaveLength(3);
    expect(s.answers[2]?.retry).toBe(true);
    s = nextQuestion(s);
    expect(isFlowOver(s)).toBe(true);
    expect(countedAnswers(s.answers)).toHaveLength(2);
    expect(dotsProgress(s)).toEqual({ total: 2, done: 2 });
  });

  it('repère la question reposée même si la remise en file en fait une copie', () => {
    const cloning: Requeue = (queue, index) => [...queue, { ...(queue[index] as ReadingQuestion) }];
    let s = initFlow(plan([q1]));
    s = recordFirstAttempt(s, answerFor(q1, 'b'), cloning);
    s = nextQuestion(s);
    expect(isRetryTurn(s)).toBe(true);
    expect(currentQuestion(s)).not.toBe(q1);
  });
});

describe('démonstration', () => {
  it('seule la première question d\'un jeu à démontrer est un exemple ; elle est remise en fin de file, sans réponse', () => {
    let s = initFlow(plan([q1, q2, q3], ['letter-sound']));
    expect(isDemoTurn(s)).toBe(true);
    s = completeDemo(s);
    expect(s.answers).toHaveLength(0);
    expect(s.demosDone).toEqual(['letter-sound']);
    expect(s.pendingDemos).toEqual([]);
    expect(s.queue).toHaveLength(4);
    expect(s.queue[3]).toBe(q1);
    expect(currentQuestion(s)).toBe(q2);
    expect(isDemoTurn(s)).toBe(false);
    // q3 (même jeu) n'est plus une démonstration.
    s = nextQuestion(s);
    s = nextQuestion(s);
    expect(currentQuestion(s)).toBe(q1);
    expect(isDemoTurn(s)).toBe(false);
    expect(isRetryTurn(s)).toBe(false);
    expect(dotsProgress(s).done).toBe(0);
  });

  it('plusieurs démonstrations : chaque jeu une fois', () => {
    let s = initFlow(plan([q1, q2, q3], ['letter-sound', 'first-sound']));
    s = completeDemo(s);
    expect(isDemoTurn(s)).toBe(true); // q2 : first-sound
    s = completeDemo(s);
    expect(s.demosDone).toEqual(['letter-sound', 'first-sound']);
    expect(isDemoTurn(s)).toBe(false);
    expect(s.queue).toHaveLength(5);
  });
});

describe('aides', () => {
  it('cibles de la main animée', () => {
    expect(guidedTargets(q1)).toEqual(['a']);
    const drum: ReadingQuestion = { ...q1, game: 'syllable-drum', choices: [], answer: '3' };
    expect(guidedTargets(drum)).toEqual(['drum', 'drum', 'drum']);
  });

  it('son d\'un choix faux : lettre et syllabe seulement', () => {
    const letter: ReadingChoice = { id: 'm', kind: 'letter', label: 'M' };
    const syl: ReadingChoice = { id: 'la', kind: 'syllable', label: 'LA' };
    const pic: ReadingChoice = { id: 'lapin', kind: 'picture', picture: 'lapin' };
    const lower: ReadingChoice = { id: 'm', kind: 'lower', label: 'm' };
    expect(soundOfChoice(letter)).toEqual({ type: 'grapheme', id: 'm' });
    expect(soundOfChoice(syl)).toEqual({ type: 'syllable', id: 'la' });
    expect(soundOfChoice(pic)).toBeNull();
    expect(soundOfChoice(lower)).toBeNull();
    expect(soundOfChoice(undefined)).toBeNull();
  });
});
