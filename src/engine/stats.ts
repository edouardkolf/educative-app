// Statistiques par niveau, définitions de référence : docs/ARCHITECTURE.md §7.
import type { Run } from '../storage/types';
import type { LevelStats } from './types';

export function computeLevelStats(levelId: string, runs: Run[]): LevelStats {
  const levelRuns = runs.filter((run) => run.levelId === levelId);

  const completed = levelRuns.filter((run) => run.status === 'completed').length;
  const abandoned = levelRuns.filter(
    (run) => run.status === 'abandoned' && (run.endReason === 'quit' || run.endReason === 'closed'),
  ).length;
  const interrupted = levelRuns.filter((run) => run.endReason === 'time-up').length;
  const replays = levelRuns.filter((run) => run.replay).length;

  let roundsPlayed = 0;
  let firstTries = 0;
  let playTimeMs = 0;
  let bestStars: 0 | 1 | 2 | 3 = 0;
  let lastPlayedAt: number | null = null;

  for (const run of levelRuns) {
    roundsPlayed += run.rounds.length;
    for (const round of run.rounds) {
      if (round.firstTry) firstTries += 1;
      playTimeMs += round.durationMs;
    }
    if (run.stars > bestStars) bestStars = run.stars;
    if (lastPlayedAt === null || run.startedAt > lastPlayedAt) lastPlayedAt = run.startedAt;
  }

  return {
    levelId,
    runs: levelRuns.length,
    completed,
    abandoned,
    interrupted,
    replays,
    roundsPlayed,
    firstTryRate: roundsPlayed === 0 ? null : firstTries / roundsPlayed,
    bestStars,
    playTimeMs,
    lastPlayedAt,
  };
}
