// Progression sur un parcours : état de chaque niveau, recalculé à partir des parties (aucune donnée dupliquée).
import type { LevelOverride, Run } from '../storage/types';
import type { LevelState, LevelStatus, Track } from './types';

function bestStarsFor(levelId: string, runs: Run[]): 0 | 1 | 2 | 3 {
  let best: 0 | 1 | 2 | 3 = 0;
  for (const run of runs) {
    if (run.levelId === levelId && run.stars > best) best = run.stars;
  }
  return best;
}

/** Vrai si l'enfant a déjà terminé ce niveau au moins une fois (sert à marquer les rejeux). */
export function hasCompleted(levelId: string, runs: Run[]): boolean {
  return runs.some((run) => run.levelId === levelId && run.status === 'completed');
}

export function computeLevelStates(track: Track, runs: Run[], overrides: LevelOverride[]): LevelState[] {
  const minStars = track.minStarsToUnlockNext ?? 1;
  const overrideByLevel = new Map(overrides.map((o) => [o.levelId, o.state]));
  const starsByLevel = new Map(track.levels.map((levelId) => [levelId, bestStarsFor(levelId, runs)]));

  const states: LevelState[] = track.levels.map((levelId, index) => {
    const bestStars = starsByLevel.get(levelId) ?? 0;
    const prevStars = index === 0 ? null : (starsByLevel.get(track.levels[index - 1] as string) ?? 0);
    const chainUnlocked = index === 0 || (prevStars ?? 0) >= minStars;

    // Règle de base (chaîne du parcours), puis : ≥ 1 étoile reste accessible même si le précédent
    // n'a plus assez d'étoiles (ex. seuil du parcours durci après coup).
    let status: LevelStatus = chainUnlocked ? 'unlocked' : 'locked';
    if (bestStars >= 1) status = 'completed';

    // Le réglage du parent prime sur tout le reste.
    const override = overrideByLevel.get(levelId);
    let overridden = false;
    if (override === 'locked') {
      status = 'locked';
      overridden = true;
    } else if (override === 'unlocked') {
      status = bestStars >= 1 ? 'completed' : 'unlocked';
      overridden = true;
    }

    return { levelId, status, bestStars, current: false, overridden };
  });

  const currentIndex = states.findIndex((s) => s.status === 'unlocked');
  if (currentIndex !== -1) {
    const current = states[currentIndex];
    if (current) states[currentIndex] = { ...current, current: true };
  }

  return states;
}
