// Résumé global (tous niveaux confondus) affiché en tête des statistiques d'un enfant.
// Calcul direct à partir des parties : pas besoin de moteur, donc testable ici sans dépendance.
import type { Run } from '../storage';

export interface RunsSummary {
  /** Parties lancées, tous niveaux confondus. */
  totalRuns: number;
  /** Manches réussies du premier coup / manches jouées ; null si aucune manche. */
  firstTryRate: number | null;
  /** Temps de jeu cumulé (somme des durées de manches), en ms. */
  playTimeMs: number;
}

export function summarizeRuns(runs: Run[]): RunsSummary {
  let roundsPlayed = 0;
  let firstTry = 0;
  let playTimeMs = 0;
  for (const run of runs) {
    for (const round of run.rounds) {
      roundsPlayed += 1;
      if (round.firstTry) firstTry += 1;
      playTimeMs += round.durationMs;
    }
  }
  return {
    totalRuns: runs.length,
    firstTryRate: roundsPlayed > 0 ? firstTry / roundsPlayed : null,
    playTimeMs,
  };
}
