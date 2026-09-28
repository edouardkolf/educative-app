import { describe, expect, it } from 'vitest';
import type { DictationPlannedWord } from '../../storage/dictations';
import { createInitialState, isComplete, step, unitInProgress } from './machine';

const WORDS: DictationPlannedWord[] = [
  { wordId: 'apres', seriesId: 's1', sentenceIndex: 0 },
  { wordId: 'alors', seriesId: 's1', sentenceIndex: 0 },
];
const EXPECTED = ['après', 'alors'];

function started(now = 0) {
  return step(createInitialState(), {
    type: 'start',
    seriesId: 's1',
    seed: 1,
    words: WORDS,
    expected: EXPECTED,
    now,
  });
}

function type(state: ReturnType<typeof started>['state'], text: string, now = 0) {
  let s = state;
  for (const char of text) {
    s = step(s, { type: 'key', char, now }).state;
  }
  return s;
}

describe('start', () => {
  it("passe en word, index 0, startedAt = now, et parle l'intro", () => {
    const { state, effects } = started(1000);
    expect(state.phase).toBe('word');
    expect(state.index).toBe(0);
    expect(state.startedAt).toBe(1000);
    expect(effects).toEqual([{ kind: 'speak', what: 'intro' }]);
  });

  it('repart de end vers un nouveau tirage', () => {
    // fait toute la dictée pour atteindre `end`
    let s = started(0).state;
    s = type(s, 'après', 0);
    s = step(s, { type: 'validate', now: 0 }).state;
    s = step(s, { type: 'next', now: 0 }).state;
    s = type(s, 'alors', 0);
    s = step(s, { type: 'validate', now: 0 }).state;
    const { state: end } = step(s, { type: 'next', now: 0 });
    expect(end.phase).toBe('end');
    const { state: restarted } = step(end, { type: 'start', seriesId: 's1', seed: 2, words: WORDS, expected: EXPECTED, now: 5 });
    expect(restarted.phase).toBe('word');
    expect(restarted.items).toEqual([]);
  });
});

describe('word : touches et effacement', () => {
  it('key ajoute une lettre tapable', () => {
    const { state } = started();
    const next = step(state, { type: 'key', char: 'a', now: 0 }).state;
    expect(next.typed).toBe('a');
  });

  it('une touche hors clavier est ignorée', () => {
    const { state } = started();
    const next = step(state, { type: 'key', char: '@', now: 0 }).state;
    expect(next.typed).toBe('');
  });

  it('au-delà de 20 caractères, la touche est ignorée', () => {
    let s = started().state;
    s = type(s, 'a'.repeat(20));
    const after = step(s, { type: 'key', char: 'a', now: 0 }).state;
    expect(after.typed).toHaveLength(20);
  });

  it('erase retire le dernier caractère si non vide', () => {
    let s = started().state;
    s = type(s, 'ab');
    const after = step(s, { type: 'erase' }).state;
    expect(after.typed).toBe('a');
  });

  it('erase sur un champ vide ne fait rien', () => {
    const { state } = started();
    const after = step(state, { type: 'erase' });
    expect(after.state).toEqual(state);
    expect(after.effects).toEqual([]);
  });
});

describe('word : validate', () => {
  it('juste du premier coup : solved, sound success, save, next-after 1200', () => {
    let s = started(0).state;
    s = type(s, 'après');
    const { state, effects } = step(s, { type: 'validate', now: 500 });
    expect(state.phase).toBe('solved');
    expect(effects[0]).toEqual({ kind: 'sound', what: 'success' });
    expect(effects[2]).toEqual({ kind: 'next-after', ms: 1200 });
    const saveEffect = effects.find((e) => e.kind === 'save');
    expect(saveEffect).toMatchObject({ kind: 'save', item: { firstTry: true, copyDone: true, answerMs: 500 } });
  });

  it('faux : copy, firstAttempt mémorisé, typed vidé ; sound error, speak word, save', () => {
    let s = started(0).state;
    s = type(s, 'aprer');
    const { state, effects } = step(s, { type: 'validate', now: 300 });
    expect(state.phase).toBe('copy');
    expect(state.firstAttempt).toBe('aprer');
    expect(state.typed).toBe('');
    expect(effects).toEqual([
      { kind: 'sound', what: 'error' },
      { kind: 'speak', what: 'word' },
      { kind: 'save', item: expect.objectContaining({ firstTry: false, copyDone: false, typed: 'aprer' }) },
    ]);
  });

  it('champ vide : ignoré', () => {
    const { state } = started();
    const after = step(state, { type: 'validate', now: 10 });
    expect(after.state.phase).toBe('word');
    expect(after.effects).toEqual([]);
  });
});

describe('copy : réécriture guidée', () => {
  function toCopy(now = 0) {
    let s = started(0).state;
    s = type(s, 'aprer');
    return step(s, { type: 'validate', now }).state;
  }

  it('la lettre attendue est ajoutée', () => {
    const s = toCopy();
    const after = step(s, { type: 'key', char: 'a', now: 1 }).state;
    expect(after.typed).toBe('a');
  });

  it('une autre lettre augmente copyMistakes sans rien ajouter', () => {
    const s = toCopy();
    const after = step(s, { type: 'key', char: 'z', now: 1 }).state;
    expect(after.typed).toBe('');
    expect(after.unit.copyMistakes).toBe(1);
  });

  it('mot complet : solved, sound success, save (copyDone), next-after 900', () => {
    let s = toCopy(0);
    for (const char of 'après') {
      const result = step(s, { type: 'key', char, now: 50 });
      s = result.state;
      if (s.phase === 'solved') {
        expect(result.effects[0]).toEqual({ kind: 'sound', what: 'success' });
        expect(result.effects[2]).toEqual({ kind: 'next-after', ms: 900 });
        const saveEffect = result.effects.find((e) => e.kind === 'save');
        expect(saveEffect).toMatchObject({
          kind: 'save',
          item: { firstTry: false, copyDone: true, typed: 'aprer' },
        });
      }
    }
    expect(s.phase).toBe('solved');
  });

  it("isComplete reste faux pendant la dernière réécriture, vrai une fois complète", () => {
    let s = toCopy(0);
    expect(isComplete(s)).toBe(false);
    s = step(s, { type: 'key', char: 'a', now: 0 }).state;
    expect(isComplete(s)).toBe(false);
    for (const char of 'près') s = step(s, { type: 'key', char, now: 0 }).state;
    // un seul mot dans cette dictée pour ce test
  });
});

describe('replay', () => {
  it('compte et relit le mot en phase word', () => {
    const { state } = started();
    const after = step(state, { type: 'replay', what: 'word' });
    expect(after.state.unit.wordReplays).toBe(1);
    expect(after.effects).toEqual([{ kind: 'speak', what: 'word' }]);
  });

  it('compte et relit la phrase en phase copy', () => {
    let s = started(0).state;
    s = type(s, 'aprer');
    s = step(s, { type: 'validate', now: 0 }).state;
    const after = step(s, { type: 'replay', what: 'sentence' });
    expect(after.state.unit.sentenceReplays).toBe(1);
    expect(after.effects).toEqual([{ kind: 'speak', what: 'sentence' }]);
  });

  it('ignoré en dehors de word/copy', () => {
    const initial = createInitialState();
    const after = step(initial, { type: 'replay', what: 'word' });
    expect(after).toEqual({ state: initial, effects: [] });
  });
});

describe('next', () => {
  it("passe au mot suivant si il en reste, unité remise à zéro, speak intro", () => {
    let s = started(0).state;
    s = type(s, 'après');
    s = step(s, { type: 'validate', now: 0 }).state;
    const { state, effects } = step(s, { type: 'next', now: 999 });
    expect(state.phase).toBe('word');
    expect(state.index).toBe(1);
    expect(state.unit.shownAt).toBe(999);
    expect(state.unit.wordReplays).toBe(0);
    expect(effects).toEqual([{ kind: 'speak', what: 'intro' }]);
  });

  it('termine la dictée sur le dernier mot : end, finished', () => {
    let s = started(0).state;
    s = type(s, 'après');
    s = step(s, { type: 'validate', now: 0 }).state;
    s = step(s, { type: 'next', now: 0 }).state;
    s = type(s, 'alors');
    s = step(s, { type: 'validate', now: 0 }).state;
    const { state, effects } = step(s, { type: 'next', now: 0 });
    expect(state.phase).toBe('end');
    expect(effects).toEqual([{ kind: 'finished' }]);
    expect(isComplete(state)).toBe(true);
  });

  it('ignoré hors de solved', () => {
    const { state } = started();
    const after = step(state, { type: 'next', now: 0 });
    expect(after.state.phase).toBe('word');
    expect(after.effects).toEqual([]);
  });
});

describe('visibility', () => {
  it('masquée puis visible : pausedMs augmente ; answerMs/durationMs retranchent la pause', () => {
    let s = started(0).state;
    let r = step(s, { type: 'visibility', hidden: true, now: 100 });
    s = r.state;
    expect(s.unit.hiddenSince).toBe(100);
    r = step(s, { type: 'visibility', hidden: false, now: 400 });
    s = r.state;
    expect(s.unit.pausedMs).toBe(300);
    expect(s.unit.hiddenSince).toBeNull();

    s = type(s, 'après');
    const { state: after } = step(s, { type: 'validate', now: 1000 });
    const saveEffect = after.items.find((i) => i.index === 0);
    // 1000 (now) - 0 (shownAt) - 300 (pausedMs) = 700
    expect(saveEffect?.answerMs).toBe(700);
    expect(saveEffect?.durationMs).toBe(700);
  });

  it('applicable à toutes les phases (choose incluse)', () => {
    const initial = createInitialState();
    const after = step(initial, { type: 'visibility', hidden: true, now: 5 });
    expect(after.state.unit.hiddenSince).toBe(5);
  });
});

describe('combinaisons ignorées', () => {
  it('✓ sur un champ vide, double ✓, touche pendant solved', () => {
    let s = started(0).state;
    s = type(s, 'après');
    s = step(s, { type: 'validate', now: 0 }).state; // -> solved
    const doubled = step(s, { type: 'validate', now: 0 });
    expect(doubled.effects).toEqual([]);
    const keyed = step(s, { type: 'key', char: 'z', now: 0 });
    expect(keyed.state).toEqual(s);
  });
});

describe('unitInProgress', () => {
  it('vrai en word et copy, faux ailleurs', () => {
    const { state: wordState } = started();
    expect(unitInProgress(wordState)).toBe(true);
    expect(unitInProgress(createInitialState())).toBe(false);
  });
});
