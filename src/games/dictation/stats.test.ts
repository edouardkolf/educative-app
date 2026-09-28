import { describe, expect, it } from 'vitest';
import type { DictationItem, DictationRecord } from '../../storage/dictations';
import { computeDictationStats } from './stats';

function item(overrides: Partial<DictationItem>): DictationItem {
  return {
    index: 0,
    wordId: 'apres',
    expected: 'après',
    typed: 'après',
    firstTry: true,
    copyDone: true,
    copyMistakes: 0,
    wordReplays: 0,
    sentenceReplays: 0,
    answerMs: 1000,
    durationMs: 1000,
    ...overrides,
  };
}

function record(overrides: Partial<DictationRecord>): DictationRecord {
  return {
    id: 'r1',
    profileId: 'p1',
    startedAt: 0,
    endedAt: 1000,
    status: 'completed',
    endReason: null,
    activeMs: 1000,
    seriesId: 's1',
    seed: 1,
    words: [{ wordId: 'apres', seriesId: 's1', sentenceIndex: 0 }],
    items: [item({})],
    ...overrides,
  };
}

describe('computeDictationStats', () => {
  it('rend des indicateurs null sans aucun item', () => {
    const stats = computeDictationStats([], 0);
    expect(stats.wordsDictated).toBe(0);
    expect(stats.firstTryRate).toBeNull();
    expect(stats.replaysPerWord).toBeNull();
    expect(stats.medianAnswerMs).toBeNull();
    expect(stats.lastDictation).toBeNull();
    expect(stats.byWord).toEqual([]);
    expect(stats.fragileWords).toEqual([]);
  });

  it('mots dictés, réussite au 1er coup, réécoutes par mot, temps médian', () => {
    const r = record({
      words: [
        { wordId: 'apres', seriesId: 's1', sentenceIndex: 0 },
        { wordId: 'alors', seriesId: 's1', sentenceIndex: 0 },
      ],
      items: [
        item({ index: 0, wordId: 'apres', firstTry: true, answerMs: 1000, wordReplays: 1, sentenceReplays: 0 }),
        item({ index: 1, wordId: 'alors', firstTry: false, answerMs: 3000, wordReplays: 0, sentenceReplays: 1 }),
      ],
    });
    const stats = computeDictationStats([r], 0);
    expect(stats.wordsDictated).toBe(2);
    expect(stats.firstTryRate).toBe(0.5);
    expect(stats.replaysPerWord).toBe(1); // (1 + 1) / 2
    expect(stats.medianAnswerMs).toBe(2000);
  });

  it('dernière dictée : série et score de la dictée la plus récente', () => {
    const r1 = record({ id: 'r1', startedAt: 0, seriesId: 's1', items: [item({ firstTry: true })] });
    const r2 = record({
      id: 'r2',
      startedAt: 1000,
      seriesId: 's2',
      words: [
        { wordId: 'aussi', seriesId: 's2', sentenceIndex: 0 },
        { wordId: 'autant', seriesId: 's2', sentenceIndex: 0 },
      ],
      items: [
        item({ index: 0, wordId: 'aussi', firstTry: true }),
        item({ index: 1, wordId: 'autant', firstTry: false }),
      ],
    });
    const stats = computeDictationStats([r1, r2], 0);
    expect(stats.lastDictation).toEqual({ seriesId: 's2', firstTry: 1, total: 2 });
  });

  it('par série : dictées lancées et score de la dernière dictée terminée', () => {
    const r1 = record({ id: 'r1', startedAt: 0, seriesId: 's1', status: 'completed', items: [item({ firstTry: true })] });
    const r2 = record({ id: 'r2', startedAt: 100, seriesId: 's1', status: 'abandoned', endReason: 'quit', items: [] });
    const stats = computeDictationStats([r1, r2], 0);
    const s1 = stats.bySeries.find((s) => s.seriesId === 's1');
    expect(s1?.launched).toBe(2);
    expect(s1?.lastCompletedScore).toEqual({ firstTry: 1, total: 1 });
  });

  it('mot fragile : dernière tentative fausse', () => {
    const r = record({ items: [item({ firstTry: false, typed: 'apres' })] });
    const stats = computeDictationStats([r], 0);
    expect(stats.byWord[0]?.status).toBe('fragile');
    expect(stats.fragileWords).toHaveLength(1);
  });

  it('mot fragile : au moins 2 fausses parmi les 3 dernières', () => {
    const r1 = record({ id: 'r1', startedAt: 0, items: [item({ firstTry: false, typed: 'a' })] });
    const r2 = record({ id: 'r2', startedAt: 1, items: [item({ firstTry: false, typed: 'b' })] });
    const r3 = record({ id: 'r3', startedAt: 2, items: [item({ firstTry: true })] });
    const stats = computeDictationStats([r1, r2, r3], 0);
    expect(stats.byWord[0]?.status).toBe('fragile');
    // saisies fausses distinctes parmi les 3 dernières tentatives
    expect(stats.byWord[0]?.wrongTypings.sort()).toEqual(['a', 'b']);
  });

  it('mot su : au moins 3 tentatives et les 3 dernières justes du premier coup', () => {
    const records = [0, 1, 2].map((i) =>
      record({ id: `r${i}`, startedAt: i, items: [item({ firstTry: true })] }),
    );
    const stats = computeDictationStats(records, 0);
    expect(stats.byWord[0]?.status).toBe('known');
  });

  it('mot en cours : moins de 3 tentatives, pas fragile', () => {
    const r = record({ items: [item({ firstTry: true })] });
    const stats = computeDictationStats([r], 0);
    expect(stats.byWord[0]?.status).toBe('in-progress');
  });

  it('tri : fragiles, en cours, sus, puis par taux croissant, puis alphabétique', () => {
    const fragile = record({
      id: 'r-fragile',
      startedAt: 0,
      words: [{ wordId: 'beaucoup', seriesId: 's3', sentenceIndex: 0 }],
      items: [item({ wordId: 'beaucoup', expected: 'beaucoup', firstTry: false, typed: 'bocoup' })],
    });
    const known = [0, 1, 2].map((i) =>
      record({
        id: `r-known-${i}`,
        startedAt: 10 + i,
        seriesId: 's1',
        words: [{ wordId: 'apres', seriesId: 's1', sentenceIndex: 0 }],
        items: [item({ wordId: 'apres', expected: 'après', firstTry: true })],
      }),
    );
    const inProgress = record({
      id: 'r-inprogress',
      startedAt: 20,
      seriesId: 's1',
      words: [{ wordId: 'alors', seriesId: 's1', sentenceIndex: 0 }],
      items: [item({ wordId: 'alors', expected: 'alors', firstTry: true })],
    });
    const stats = computeDictationStats([fragile, ...known, inProgress], 0);
    expect(stats.byWord.map((w) => w.wordId)).toEqual(['beaucoup', 'alors', 'apres']);
  });

  it('mot sorti du catalogue : montré par `expected`', () => {
    const r = record({
      words: [{ wordId: 'inconnu-xyz', seriesId: 's1', sentenceIndex: 0 }],
      items: [item({ wordId: 'inconnu-xyz', expected: 'motdisparu', firstTry: true })],
    });
    const stats = computeDictationStats([r], 0);
    expect(stats.byWord[0]?.label).toBe('motdisparu');
  });
});
