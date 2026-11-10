import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReadingAnswer } from '../games/reading/types';
import { resetStorageForTests } from './test-helpers';
import {
  abandonReading,
  closeStaleGameRecords,
  completeReading,
  isReadingFinished,
  isReadingRecord,
  isReadingSettings,
  listReadings,
  saveReadingAnswers,
  startReading,
  type ReadingInit,
  type ReadingRecord,
} from './index';

beforeEach(async () => {
  await resetStorageForTests();
});

function answer(over: Partial<ReadingAnswer> = {}): ReadingAnswer {
  return {
    itemId: 'g:m',
    game: 'letter-sound',
    target: 'm',
    correct: true,
    chosen: null,
    choiceCount: 3,
    replays: 0,
    hinted: false,
    retry: false,
    ms: 2000,
    at: 1000,
    ...over,
  };
}

const INIT: ReadingInit = { stage: 3, planned: 9, newItemId: 'g:m', demos: [], answers: [], review: false };

describe('séances de lecture (store readings)', () => {
  it('startReading crée une séance in_progress, listReadings la retrouve par enfant', async () => {
    const record = await startReading('p1', { ...INIT, answers: [answer()] });
    await startReading('p2', { ...INIT });

    expect(record).toMatchObject({ profileId: 'p1', status: 'in_progress', stage: 3, planned: 9, review: false, activeMs: 0 });
    const list = await listReadings('p1');
    expect(list).toHaveLength(1);
    expect(list[0]?.answers).toHaveLength(1);
  });

  it('saveReadingAnswers remplace réponses, démos et temps actif', async () => {
    const record = await startReading('p1', INIT);
    await saveReadingAnswers(record.id, [answer(), answer({ correct: false, chosen: 'n' })], ['letter-sound'], 4200);

    const [stored] = await listReadings('p1');
    expect(stored?.answers).toHaveLength(2);
    expect(stored?.demos).toEqual(['letter-sound']);
    expect(stored?.activeMs).toBe(4200);
    expect(stored?.status).toBe('in_progress');
  });

  it('completeReading clôt la séance ; une séance close ne se rouvre pas', async () => {
    const record = await startReading('p1', INIT);
    await completeReading(record.id, [answer()], [], 9000);
    await saveReadingAnswers(record.id, [], [], 1);
    await abandonReading(record.id, 'quit');

    const [stored] = await listReadings('p1');
    expect(stored).toMatchObject({ status: 'completed', endReason: null, activeMs: 9000 });
    expect(stored?.answers).toHaveLength(1);
    expect(stored?.endedAt).not.toBeNull();
  });

  it('abandonReading note la raison et garde le temps actif si absent', async () => {
    const record = await startReading('p1', INIT);
    await saveReadingAnswers(record.id, [answer()], [], 3000);
    await abandonReading(record.id, 'time-up');

    const [stored] = await listReadings('p1');
    expect(stored).toMatchObject({ status: 'abandoned', endReason: 'time-up', activeMs: 3000 });
  });

  it('clôture au lancement : séance complète → completed, sinon abandoned/closed', async () => {
    const full = await startReading('p1', { ...INIT, planned: 2 });
    await saveReadingAnswers(full.id, [answer(), answer({ at: 2 })], [], 100);
    const partial = await startReading('p1', { ...INIT, planned: 2 });
    await saveReadingAnswers(partial.id, [answer()], [], 100);

    expect(await closeStaleGameRecords()).toBe(2);

    const byId = new Map((await listReadings('p1')).map((r) => [r.id, r]));
    expect(byId.get(full.id)).toMatchObject({ status: 'completed', endReason: null });
    expect(byId.get(partial.id)).toMatchObject({ status: 'abandoned', endReason: 'closed' });
  });
});

describe('isReadingFinished', () => {
  const rec = (planned: number, answers: ReadingAnswer[]) => ({ planned, answers }) as ReadingRecord;

  it('compte les premières tentatives seulement', () => {
    expect(isReadingFinished(rec(2, [answer(), answer({ retry: true })]))).toBe(false);
    expect(isReadingFinished(rec(2, [answer(), answer(), answer({ retry: true })]))).toBe(true);
    expect(isReadingFinished(rec(9, []))).toBe(false);
  });
});

describe('isReadingRecord (validation stricte à l\'import)', () => {
  async function valid(): Promise<ReadingRecord> {
    const record = await startReading('p1', { ...INIT, demos: ['letter-sound'], answers: [answer()] });
    return record;
  }

  it('accepte une séance valide', async () => {
    expect(isReadingRecord(await valid())).toBe(true);
    expect(isReadingRecord({ ...(await valid()), newItemId: null, review: true })).toBe(true);
  });

  it('refuse les champs invalides', async () => {
    const base = await valid();
    expect(isReadingRecord(null)).toBe(false);
    expect(isReadingRecord({ ...base, stage: 0 })).toBe(false);
    expect(isReadingRecord({ ...base, stage: 6 })).toBe(false);
    expect(isReadingRecord({ ...base, stage: 2.5 })).toBe(false);
    expect(isReadingRecord({ ...base, planned: 0 })).toBe(false);
    expect(isReadingRecord({ ...base, newItemId: 'x:m' })).toBe(false);
    expect(isReadingRecord({ ...base, newItemId: 'k:inconnue' })).toBe(false);
    expect(isReadingRecord({ ...base, demos: ['pas-un-jeu'] })).toBe(false);
    expect(isReadingRecord({ ...base, demos: ['letter-sound', 'letter-sound'] })).toBe(false);
    expect(isReadingRecord({ ...base, review: 'non' })).toBe(false);
    expect(isReadingRecord({ ...base, answers: 'nope' })).toBe(false);
    expect(isReadingRecord({ ...base, status: 'bizarre' })).toBe(false);
  });

  it('refuse les réponses invalides ou trop nombreuses', async () => {
    const base = await valid();
    const bad = (over: Record<string, unknown>) => isReadingRecord({ ...base, answers: [{ ...answer(), ...over }] });
    expect(bad({})).toBe(true);
    expect(bad({ game: 'inconnu' })).toBe(false);
    expect(bad({ itemId: 'k:read' })).toBe(true);
    expect(bad({ itemId: 'k:nimporte' })).toBe(false);
    expect(bad({ itemId: 'g:' })).toBe(false);
    expect(bad({ target: '' })).toBe(false);
    expect(bad({ correct: 1 })).toBe(false);
    expect(bad({ chosen: 3 })).toBe(false);
    expect(bad({ choiceCount: -1 })).toBe(false);
    expect(bad({ replays: 1.5 })).toBe(false);
    expect(bad({ ms: Number.NaN })).toBe(false);
    expect(bad({ retry: undefined })).toBe(false);
    const many = Array.from({ length: 61 }, () => answer());
    expect(isReadingRecord({ ...base, answers: many })).toBe(false);
    expect(isReadingRecord({ ...base, answers: many.slice(0, 60) })).toBe(true);
  });
});

describe('isReadingSettings', () => {
  it('accepte absent ou 1 à 5, refuse le reste', () => {
    expect(isReadingSettings({})).toBe(true);
    expect(isReadingSettings({ startStage: 1 })).toBe(true);
    expect(isReadingSettings({ startStage: 5 })).toBe(true);
    expect(isReadingSettings({ startStage: 0 })).toBe(false);
    expect(isReadingSettings({ startStage: 6 })).toBe(false);
    expect(isReadingSettings({ startStage: '2' })).toBe(false);
    expect(isReadingSettings(null)).toBe(false);
    expect(isReadingSettings([])).toBe(false);
  });
});
