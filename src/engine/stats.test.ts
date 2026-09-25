import { describe, expect, it } from 'vitest';
import { computeLevelStats } from './stats';
import type { Run, RoundRecord } from '../storage/types';

let seq = 0;
function makeRun(partial: Partial<Run> = {}): Run {
  seq += 1;
  return {
    id: `run-${seq}`,
    profileId: 'p1',
    levelId: 'l1',
    trackId: 't1',
    startedAt: seq * 1000,
    endedAt: seq * 1000 + 500,
    status: 'completed',
    endReason: null,
    replay: false,
    rounds: [],
    stars: 3,
    ...partial,
  };
}

function makeRound(firstTry: boolean, durationMs = 100): RoundRecord {
  return { index: 0, taps: firstTry ? 1 : 2, firstTry, durationMs };
}

describe('computeLevelStats', () => {
  it('cas vide : aucune partie sur ce niveau', () => {
    expect(computeLevelStats('l1', [])).toEqual({
      levelId: 'l1',
      runs: 0,
      completed: 0,
      abandoned: 0,
      interrupted: 0,
      replays: 0,
      roundsPlayed: 0,
      firstTryRate: null,
      bestStars: 0,
      playTimeMs: 0,
      lastPlayedAt: null,
    });
  });

  it('runs compte toutes les parties (tous statuts), filtrées par niveau', () => {
    const runs = [
      makeRun({ status: 'in_progress', stars: 0 }),
      makeRun({ status: 'completed' }),
      makeRun({ levelId: 'autre-niveau' }),
    ];
    expect(computeLevelStats('l1', runs).runs).toBe(2);
  });

  it('completed compte les parties terminées', () => {
    const runs = [makeRun({ status: 'completed' }), makeRun({ status: 'in_progress', stars: 0 })];
    expect(computeLevelStats('l1', runs).completed).toBe(1);
  });

  it('abandoned = quit ou closed ; time-up compte comme interrupted, jamais comme abandon', () => {
    const runs = [
      makeRun({ status: 'abandoned', endReason: 'quit', stars: 0 }),
      makeRun({ status: 'abandoned', endReason: 'closed', stars: 0 }),
      makeRun({ status: 'abandoned', endReason: 'time-up', stars: 0 }),
    ];
    const stats = computeLevelStats('l1', runs);
    expect(stats.abandoned).toBe(2);
    expect(stats.interrupted).toBe(1);
  });

  it('replays = parties lancées alors que le niveau était déjà réussi', () => {
    const runs = [
      makeRun({ replay: true }),
      makeRun({ replay: false }),
      makeRun({ replay: true, status: 'in_progress', stars: 0 }),
    ];
    expect(computeLevelStats('l1', runs).replays).toBe(2);
  });

  it('roundsPlayed et firstTryRate agrègent les manches de toutes les parties', () => {
    const runs = [
      makeRun({ rounds: [makeRound(true), makeRound(false), makeRound(true)] }),
      makeRun({ rounds: [makeRound(false)], status: 'in_progress', stars: 0 }),
    ];
    const stats = computeLevelStats('l1', runs);
    expect(stats.roundsPlayed).toBe(4);
    expect(stats.firstTryRate).toBeCloseTo(2 / 4);
  });

  it('bestStars = maximum des étoiles obtenues', () => {
    const runs = [makeRun({ stars: 1 }), makeRun({ stars: 3 }), makeRun({ stars: 2 })];
    expect(computeLevelStats('l1', runs).bestStars).toBe(3);
  });

  it('playTimeMs = somme des durées de manches', () => {
    const runs = [makeRun({ rounds: [makeRound(true, 1200), makeRound(true, 800)] })];
    expect(computeLevelStats('l1', runs).playTimeMs).toBe(2000);
  });

  it('lastPlayedAt = date de début de la partie la plus récente', () => {
    const runs = [makeRun({ startedAt: 100 }), makeRun({ startedAt: 500 }), makeRun({ startedAt: 300 })];
    expect(computeLevelStats('l1', runs).lastPlayedAt).toBe(500);
  });
});
