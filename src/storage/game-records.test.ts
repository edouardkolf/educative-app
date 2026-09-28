import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import {
  closeStaleGameRecords,
  finishGameRecord,
  isGameRecordBase,
  listGameRecords,
  saveProfile,
  startGameRecord,
  updateGameRecord,
  updateSettings,
} from './index';
import type { ColoringRecord } from './colorings';

beforeEach(async () => {
  await resetStorageForTests();
});

function coloringInit(): Omit<ColoringRecord, 'id' | 'profileId' | 'startedAt' | 'endedAt' | 'status' | 'endReason' | 'activeMs'> {
  return {
    drawingId: 'house',
    tier: 1,
    detail: 1,
    variantSeed: 1,
    zones: [{ id: 'z1', target: 'red' }],
    legend: null,
    attempts: [],
    paintedAtStart: [],
    missesAtStart: {},
  };
}

describe('startGameRecord / updateGameRecord / finishGameRecord (socle générique)', () => {
  it('crée une partie in_progress avec id, startedAt, activeMs=0', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    expect(record.id).toBeTruthy();
    expect(record.profileId).toBe('p1');
    expect(record.status).toBe('in_progress');
    expect(record.endReason).toBeNull();
    expect(record.endedAt).toBeNull();
    expect(record.activeMs).toBe(0);
    expect(record.drawingId).toBe('house');
  });

  it('updateGameRecord modifie une partie in_progress et conserve les champs de base', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    const updated = await updateGameRecord('colorings', record.id, (r) => ({ ...r, activeMs: 500 }));
    expect(updated?.activeMs).toBe(500);
    expect(updated?.id).toBe(record.id);
    expect(updated?.status).toBe('in_progress');
  });

  it('updateGameRecord ne fait rien sur une partie déjà close (F6)', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    await finishGameRecord('colorings', record.id, { status: 'completed' });
    const result = await updateGameRecord('colorings', record.id, (r) => ({ ...r, activeMs: 999 }));
    expect(result?.status).toBe('completed');
    expect(result?.activeMs).toBe(0);
  });

  it('updateGameRecord sur un id inconnu renvoie undefined sans lever', async () => {
    expect(await updateGameRecord('colorings', 'inconnu', (r) => r)).toBeUndefined();
  });

  it('finishGameRecord clôt avec status/endReason et applique un dernier update', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    await finishGameRecord('colorings', record.id, { status: 'abandoned', endReason: 'quit' }, (r) => ({
      ...r,
      activeMs: 42,
    }));
    const [stored] = await listGameRecords('colorings', 'p1');
    expect(stored?.status).toBe('abandoned');
    expect(stored?.endReason).toBe('quit');
    expect(stored?.activeMs).toBe(42);
    expect(stored?.endedAt).toBeGreaterThan(0);
  });

  it('finishGameRecord ne rouvre jamais une partie déjà close', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    await finishGameRecord('colorings', record.id, { status: 'completed' });
    await finishGameRecord('colorings', record.id, { status: 'abandoned', endReason: 'quit' });
    const [stored] = await listGameRecords('colorings', 'p1');
    expect(stored?.status).toBe('completed');
  });

  it('listGameRecords trie par startedAt croissant et isole les profils', async () => {
    const a = await startGameRecord('colorings', 'p1', coloringInit());
    await new Promise((resolve) => setTimeout(resolve, 2));
    const b = await startGameRecord('colorings', 'p1', coloringInit());
    await startGameRecord('colorings', 'p2', coloringInit());

    const records = await listGameRecords('colorings', 'p1');
    expect(records.map((r) => r.id)).toEqual([a.id, b.id]);
  });
});

describe('isGameRecordBase', () => {
  it('accepte un enregistrement de base valide', () => {
    expect(
      isGameRecordBase({
        id: 'a',
        profileId: 'p1',
        startedAt: 1,
        endedAt: null,
        status: 'in_progress',
        endReason: null,
        activeMs: 0,
      }),
    ).toBe(true);
  });

  it('refuse un id vide, un statut inconnu, ou activeMs négatif', () => {
    const base = {
      id: 'a',
      profileId: 'p1',
      startedAt: 1,
      endedAt: null,
      status: 'in_progress',
      endReason: null,
      activeMs: 0,
    };
    expect(isGameRecordBase({ ...base, id: '' })).toBe(false);
    expect(isGameRecordBase({ ...base, status: 'nope' })).toBe(false);
    expect(isGameRecordBase({ ...base, activeMs: -1 })).toBe(false);
    expect(isGameRecordBase({ ...base, endReason: 'out-of-lives' })).toBe(false);
    expect(isGameRecordBase(null)).toBe(false);
    expect(isGameRecordBase('x')).toBe(false);
  });
});

describe('closeStaleGameRecords', () => {
  it('clôt une dictée finie en completed, et un coloriage inachevé en abandoned/closed', async () => {
    await saveProfile({ name: 'Léo', avatar: '🦊', trackId: 'ce1', limits: { sessionMinutes: null, dailyMinutes: null } });

    const finished = await startGameRecord('dictations', 'p1', {
      seriesId: 's1',
      seed: 1,
      words: [{ wordId: 'chat', seriesId: 's1', sentenceIndex: 0 }],
      items: [
        {
          index: 0,
          wordId: 'chat',
          expected: 'chat',
          typed: 'chat',
          firstTry: true,
          copyDone: true,
          copyMistakes: 0,
          wordReplays: 0,
          sentenceReplays: 0,
          answerMs: 100,
          durationMs: 100,
        },
      ],
    });

    const unfinished = await startGameRecord('colorings', 'p1', coloringInit());

    const count = await closeStaleGameRecords();
    expect(count).toBe(2);

    const [dictation] = await listGameRecords('dictations', 'p1');
    expect(dictation?.id).toBe(finished.id);
    expect(dictation?.status).toBe('completed');
    expect(dictation?.endReason).toBeNull();

    const [coloring] = await listGameRecords('colorings', 'p1');
    expect(coloring?.id).toBe(unfinished.id);
    expect(coloring?.status).toBe('abandoned');
    expect(coloring?.endReason).toBe('closed');
  });

  it('marque time-up si le verrou de CE profil a été posé après le début de la partie', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    await updateSettings({ lock: { reason: 'session', profileId: 'p1', lockedAt: record.startedAt + 10 } });

    await closeStaleGameRecords();

    const [stored] = await listGameRecords('colorings', 'p1');
    expect(stored?.status).toBe('abandoned');
    expect(stored?.endReason).toBe('time-up');
  });

  it('ne touche pas aux parties déjà closes', async () => {
    const record = await startGameRecord('colorings', 'p1', coloringInit());
    await finishGameRecord('colorings', record.id, { status: 'completed' });

    const count = await closeStaleGameRecords();

    expect(count).toBe(0);
    const [stored] = await listGameRecords('colorings', 'p1');
    expect(stored?.status).toBe('completed');
  });
});
