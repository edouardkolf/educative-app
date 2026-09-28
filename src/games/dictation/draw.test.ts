import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { DictationRecord } from '../../storage/dictations';
import { DICTATION_SERIES } from './series';
import { REVIEW_COUNT, defaultSeriesId, drawDictation } from './draw';

function series(id: string) {
  const found = DICTATION_SERIES.find((s) => s.id === id);
  if (!found) throw new Error(`série ${id} introuvable`);
  return found;
}

function fakeRecord(overrides: Partial<DictationRecord>): DictationRecord {
  return {
    id: 'r',
    profileId: 'p',
    startedAt: 0,
    endedAt: null,
    status: 'completed',
    endReason: null,
    activeMs: 0,
    seriesId: 's1',
    seed: 1,
    words: [],
    items: [],
    ...overrides,
  };
}

describe('drawDictation', () => {
  it('s1 donne ses 5 mots (aucune série précédente)', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const words = drawDictation(series('s1'), DICTATION_SERIES, createRng(seed));
      expect(words).toHaveLength(5);
      expect(new Set(words.map((w) => w.wordId))).toEqual(new Set(series('s1').words));
    }
  });

  it('s2 donne toujours s1 ∪ s2, seul l’ordre change', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const words = drawDictation(series('s2'), DICTATION_SERIES, createRng(seed));
      const ids = words.map((w) => w.wordId).sort();
      const expected = [...series('s1').words, ...series('s2').words].sort();
      expect(ids).toEqual(expected);
    }
  });

  it('s4 donne ses 5 mots et 5 autres de s1-s3, sans doublon', () => {
    const words = drawDictation(series('s4'), DICTATION_SERIES, createRng(7));
    expect(words).toHaveLength(10);
    const ids = words.map((w) => w.wordId);
    expect(new Set(ids).size).toBe(10);
    for (const wordId of series('s4').words) expect(ids).toContain(wordId);
    const previousPool = [...series('s1').words, ...series('s2').words, ...series('s3').words];
    const reviewIds = ids.filter((id) => !series('s4').words.includes(id));
    expect(reviewIds).toHaveLength(REVIEW_COUNT);
    for (const id of reviewIds) expect(previousPool).toContain(id);
  });

  it('la même graine redonne le même tirage', () => {
    const a = drawDictation(series('s4'), DICTATION_SERIES, createRng(42));
    const b = drawDictation(series('s4'), DICTATION_SERIES, createRng(42));
    expect(a).toEqual(b);
  });

  it('tirage figé pour la graine 42 (série s4)', () => {
    const words = drawDictation(series('s4'), DICTATION_SERIES, createRng(42));
    expect(words.map((w) => `${w.wordId}:${w.sentenceIndex}`)).toMatchInlineSnapshot(`
      [
        "afin:0",
        "autrefois:0",
        "beaucoup:0",
        "ceci:0",
        "car:2",
        "bien:1",
        "assez:0",
        "aussitot:0",
        "cela:2",
        "bientot:1",
      ]
    `);
  });

  it('sentenceIndex reste dans les bornes du catalogue', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const words = drawDictation(series('s4'), DICTATION_SERIES, createRng(seed));
      for (const w of words) expect(w.sentenceIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('uniformité : chaque mot révisé de s1-s3 sort entre 850 et 1150 fois sur 3000 graines (s4)', () => {
    const counts = new Map<string, number>();
    for (const wordId of [...series('s1').words, ...series('s2').words, ...series('s3').words]) {
      counts.set(wordId, 0);
    }
    for (let seed = 1; seed <= 3000; seed += 1) {
      const words = drawDictation(series('s4'), DICTATION_SERIES, createRng(seed));
      for (const w of words) {
        if (series('s4').words.includes(w.wordId)) continue;
        counts.set(w.wordId, (counts.get(w.wordId) ?? 0) + 1);
      }
    }
    for (const [wordId, count] of counts) {
      expect(count, `mot « ${wordId} »`).toBeGreaterThanOrEqual(850);
      expect(count, `mot « ${wordId} »`).toBeLessThanOrEqual(1150);
    }
  });
});

describe('defaultSeriesId', () => {
  it('renvoie la première série sans historique', () => {
    expect(defaultSeriesId([], DICTATION_SERIES)).toBe('s1');
  });

  it('renvoie la série de la dictée la plus récente (max startedAt)', () => {
    const records = [
      fakeRecord({ seriesId: 's1', startedAt: 100 }),
      fakeRecord({ seriesId: 's2', startedAt: 300 }),
      fakeRecord({ seriesId: 's3', startedAt: 200 }),
    ];
    expect(defaultSeriesId(records, DICTATION_SERIES)).toBe('s2');
  });

  it('retombe sur la première série si celle-ci a disparu', () => {
    const records = [fakeRecord({ seriesId: 's99', startedAt: 500 })];
    expect(defaultSeriesId(records, DICTATION_SERIES)).toBe('s1');
  });

  it('regarde tous les statuts, pas seulement les dictées terminées', () => {
    const records = [
      fakeRecord({ seriesId: 's1', startedAt: 100, status: 'completed' }),
      fakeRecord({ seriesId: 's3', startedAt: 400, status: 'abandoned', endReason: 'quit' }),
    ];
    expect(defaultSeriesId(records, DICTATION_SERIES)).toBe('s3');
  });
});
