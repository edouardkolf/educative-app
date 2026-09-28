import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import {
  abandonDictation,
  completeDictation,
  isDictationFinished,
  isDictationRecord,
  listDictations,
  saveDictationItem,
  startDictation,
} from './index';
import type { DictationItem, DictationRecord } from './dictations';

beforeEach(async () => {
  await resetStorageForTests();
});

function item(index: number, overrides: Partial<DictationItem> = {}): DictationItem {
  return {
    index,
    wordId: `word-${index}`,
    expected: 'chat',
    typed: 'chat',
    firstTry: true,
    copyDone: true,
    copyMistakes: 0,
    wordReplays: 0,
    sentenceReplays: 0,
    answerMs: 500,
    durationMs: 600,
    ...overrides,
  };
}

function words(count: number) {
  return Array.from({ length: count }, (_, i) => ({ wordId: `word-${i}`, seriesId: 's1', sentenceIndex: 0 }));
}

describe('startDictation / saveDictationItem', () => {
  it('crée une dictée in_progress sans item', async () => {
    const record = await startDictation('p1', { seriesId: 's1', seed: 1, words: words(2) });
    expect(record.status).toBe('in_progress');
    expect(record.items).toEqual([]);
  });

  it('saveDictationItem ajoute, remplace (même index) et trie, puis recalcule activeMs', async () => {
    const record = await startDictation('p1', { seriesId: 's1', seed: 1, words: words(2) });

    await saveDictationItem(record.id, item(1, { durationMs: 300 }));
    await saveDictationItem(record.id, item(0, { durationMs: 100 }));
    let [stored] = await listDictations('p1');
    expect(stored?.items.map((i) => i.index)).toEqual([0, 1]);
    expect(stored?.activeMs).toBe(400);

    // Remplace l'item d'index 0 : pas de doublon, activeMs recalculé.
    await saveDictationItem(record.id, item(0, { durationMs: 150, firstTry: false }));
    [stored] = await listDictations('p1');
    expect(stored?.items).toHaveLength(2);
    expect(stored?.items[0]?.firstTry).toBe(false);
    expect(stored?.activeMs).toBe(450);
  });

  it('n\'agit que sur une dictée in_progress (F6)', async () => {
    const record = await startDictation('p1', { seriesId: 's1', seed: 1, words: words(1) });
    await saveDictationItem(record.id, item(0));
    await completeDictation(record.id);

    await saveDictationItem(record.id, item(0, { durationMs: 9999 }));

    const [stored] = await listDictations('p1');
    expect(stored?.activeMs).toBe(600); // inchangé
  });
});

describe('completeDictation / abandonDictation', () => {
  it('completeDictation passe la dictée à completed', async () => {
    const record = await startDictation('p1', { seriesId: 's1', seed: 1, words: words(1) });
    await saveDictationItem(record.id, item(0));
    await completeDictation(record.id);

    const [stored] = await listDictations('p1');
    expect(stored?.status).toBe('completed');
  });

  it('abandonDictation passe la dictée à abandoned avec la raison donnée', async () => {
    const record = await startDictation('p1', { seriesId: 's1', seed: 1, words: words(1) });
    await abandonDictation(record.id, 'quit');

    const [stored] = await listDictations('p1');
    expect(stored?.status).toBe('abandoned');
    expect(stored?.endReason).toBe('quit');
  });
});

describe('isDictationFinished', () => {
  it('vrai quand tous les mots ont un item', async () => {
    const record = await startDictation('p1', { seriesId: 's1', seed: 1, words: words(2) });
    await saveDictationItem(record.id, item(0));
    let [stored] = await listDictations('p1');
    if (!stored) throw new Error('manquant');
    expect(isDictationFinished(stored)).toBe(false);

    await saveDictationItem(record.id, item(1));
    [stored] = await listDictations('p1');
    if (!stored) throw new Error('manquant');
    expect(isDictationFinished(stored)).toBe(true);
  });
});

describe('isDictationRecord (validation import)', () => {
  function valid(): DictationRecord {
    return {
      id: 'd1',
      profileId: 'p1',
      startedAt: 1,
      endedAt: 2,
      status: 'completed',
      endReason: null,
      activeMs: 600,
      seriesId: 's1',
      seed: 0,
      words: words(1),
      items: [item(0)],
    };
  }

  it('accepte un enregistrement valide', () => {
    expect(isDictationRecord(valid())).toBe(true);
  });

  it('refuse seriesId vide, seed négatif, words vide ou trop grand', () => {
    expect(isDictationRecord({ ...valid(), seriesId: '' })).toBe(false);
    expect(isDictationRecord({ ...valid(), seed: -1 })).toBe(false);
    expect(isDictationRecord({ ...valid(), words: [] })).toBe(false);
    expect(isDictationRecord({ ...valid(), words: words(31) })).toBe(false);
  });

  it('refuse un item avec un index hors bornes ou dupliqué', () => {
    expect(isDictationRecord({ ...valid(), items: [item(5)] })).toBe(false);
    expect(isDictationRecord({ ...valid(), words: words(2), items: [item(0), item(0)] })).toBe(false);
  });

  it('refuse un item avec des champs manquants ou du mauvais type', () => {
    const broken = { ...item(0), typed: '' };
    expect(isDictationRecord({ ...valid(), items: [broken] })).toBe(false);
    const brokenCount = { ...item(0), copyMistakes: -1 };
    expect(isDictationRecord({ ...valid(), items: [brokenCount] })).toBe(false);
  });

  it('refuse une base commune invalide', () => {
    expect(isDictationRecord({ ...valid(), id: '' })).toBe(false);
    expect(isDictationRecord(null)).toBe(false);
  });
});
