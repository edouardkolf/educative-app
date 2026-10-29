import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import { abandonPuzzle, completePuzzle, isPuzzleRecord, listPuzzles, recordPuzzleMiss, startPuzzle } from './index';

beforeEach(async () => {
  await resetStorageForTests();
});

describe('puzzles', () => {
  it('start → 2 erreurs → complete : manche résolue, pas du premier coup', async () => {
    const r = await startPuzzle('p1', { game: 'code-breaker', preset: 'medium' });
    expect(r).toMatchObject({ misses: 0, firstTry: null, outcome: null, status: 'in_progress' });
    await recordPuzzleMiss(r.id, 1000);
    await recordPuzzleMiss(r.id, 2000);
    await completePuzzle(r.id, 3000);
    const [stored] = await listPuzzles('p1');
    expect(stored).toMatchObject({ misses: 2, firstTry: false, outcome: 'solved', status: 'completed', activeMs: 3000 });
    expect(stored?.endedAt).not.toBeNull();
  });

  it('complete sans erreur : firstTry vrai', async () => {
    const r = await startPuzzle('p1', { game: 'robot', preset: 'easy' });
    await completePuzzle(r.id, 500);
    expect((await listPuzzles('p1'))[0]).toMatchObject({ misses: 0, firstTry: true });
  });

  it('abandon : abandoned avec la raison, sans résultat', async () => {
    const r = await startPuzzle('p1', { game: 'robot', preset: 'hard' });
    await abandonPuzzle(r.id, 'closed', 400);
    expect((await listPuzzles('p1'))[0]).toMatchObject({ status: 'abandoned', endReason: 'closed', outcome: null, activeMs: 400 });
  });

  it('listPuzzles filtre par jeu et par enfant', async () => {
    await startPuzzle('p1', { game: 'guess-number', preset: 'easy' });
    await startPuzzle('p1', { game: 'robot', preset: 'easy' });
    await startPuzzle('p2', { game: 'robot', preset: 'easy' });
    expect(await listPuzzles('p1')).toHaveLength(2);
    expect((await listPuzzles('p1', 'robot')).map((p) => p.game)).toEqual(['robot']);
    expect(await listPuzzles('p2', 'guess-number')).toEqual([]);
  });

  it('isPuzzleRecord refuse un jeu ou une difficulté inconnus', async () => {
    const r = await startPuzzle('p1', { game: 'robot', preset: 'easy' });
    expect(isPuzzleRecord(r)).toBe(true);
    expect(isPuzzleRecord({ ...r, game: 'chess' })).toBe(false);
    expect(isPuzzleRecord({ ...r, preset: 'extreme' })).toBe(false);
    expect(isPuzzleRecord({ ...r, misses: -1 })).toBe(false);
  });
});
