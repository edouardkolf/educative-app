import { describe, expect, it } from 'vitest';
import type { Run } from '../storage';
import { summarizeRuns } from './stats';

function run(rounds: Run['rounds']): Run {
  return {
    id: 'r',
    profileId: 'p',
    levelId: 'l',
    trackId: 't',
    startedAt: 0,
    endedAt: 1,
    status: 'completed',
    endReason: null,
    replay: false,
    rounds,
    stars: 3,
  };
}

describe('summarizeRuns', () => {
  it('renvoie des zéros et un taux nul sans partie', () => {
    expect(summarizeRuns([])).toEqual({ totalRuns: 0, firstTryRate: null, playTimeMs: 0 });
  });

  it('cumule le temps de jeu et le taux de réussite au premier coup toutes parties confondues', () => {
    const runs = [
      run([
        { index: 0, taps: 1, firstTry: true, durationMs: 1000 },
        { index: 1, taps: 2, firstTry: false, durationMs: 2000 },
      ]),
      run([{ index: 0, taps: 1, firstTry: true, durationMs: 500 }]),
    ];

    const summary = summarizeRuns(runs);

    expect(summary.totalRuns).toBe(2);
    expect(summary.playTimeMs).toBe(3500);
    expect(summary.firstTryRate).toBeCloseTo(2 / 3);
  });
});
