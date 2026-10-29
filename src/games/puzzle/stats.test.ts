import { describe, expect, it } from 'vitest';
import type { PuzzleRecord } from '../../storage/puzzles';
import { summarizePuzzles } from './stats';

function rec(preset: PuzzleRecord['preset'], solved: boolean, firstTry = true): PuzzleRecord {
  return {
    id: Math.random().toString(36),
    profileId: 'p1',
    startedAt: 1,
    endedAt: 2,
    status: solved ? 'completed' : 'abandoned',
    endReason: solved ? null : 'closed',
    activeMs: 1000,
    game: 'guess-number',
    preset,
    misses: firstTry ? 0 : 2,
    firstTry: solved ? firstTry : null,
    outcome: solved ? 'solved' : null,
  };
}

describe('summarizePuzzles', () => {
  it('sans partie : tout à zéro, taux null, pas de meilleure difficulté', () => {
    const s = summarizePuzzles([]);
    expect(s.byPreset.map((p) => p.preset)).toEqual(['easy', 'medium', 'hard']);
    expect(s.byPreset.every((p) => p.solved === 0 && p.firstTryRate === null)).toBe(true);
    expect(s.highestSolved).toBeNull();
  });

  it('compte les manches résolues et la part du premier coup par difficulté', () => {
    const s = summarizePuzzles([rec('easy', true), rec('easy', true, false), rec('easy', true), rec('easy', true, false), rec('medium', true)]);
    expect(s.byPreset[0]).toEqual({ preset: 'easy', solved: 4, firstTryRate: 0.5 });
    expect(s.byPreset[1]).toEqual({ preset: 'medium', solved: 1, firstTryRate: 1 });
    expect(s.byPreset[2]).toEqual({ preset: 'hard', solved: 0, firstTryRate: null });
    expect(s.highestSolved).toBe('medium');
  });

  it('ignore les manches non résolues, y compris pour la plus haute difficulté', () => {
    const s = summarizePuzzles([rec('easy', true), rec('hard', false)]);
    expect(s.byPreset[2]!.solved).toBe(0);
    expect(s.highestSolved).toBe('easy');
  });
});

describe('summarizePuzzles — abandons après un raté (revue)', () => {
  it('une manche abandonnée après un raté compte comme tentée, pas réussie du premier coup', () => {
    const quitAfterMiss: PuzzleRecord = { ...rec('hard', false), status: 'abandoned', endReason: 'quit', misses: 1 };
    const quitClean: PuzzleRecord = { ...rec('hard', false), status: 'abandoned', endReason: 'quit', misses: 0 };
    const s = summarizePuzzles([rec('hard', true, true), quitAfterMiss, quitClean]);
    const hard = s.byPreset.find((p) => p.preset === 'hard')!;
    expect(hard.solved).toBe(1);
    expect(hard.firstTryRate).toBeCloseTo(0.5);
  });
});
