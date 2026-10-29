// Indicateurs propres aux jeux libres de logique (docs/specs/JEUX-LOGIQUE.md §4). Les indicateurs communs
// sont calculés par parent/stats.ts. Fonction pure, testée sous Vitest.
import { PUZZLE_PRESETS } from '../../storage/puzzles';
import type { PuzzlePreset, PuzzleRecord } from '../../storage/puzzles';

export interface PresetSummary {
  preset: PuzzlePreset;
  /** Manches résolues à cette difficulté. */
  solved: number;
  /**
   * Part réussie du premier coup parmi les manches tentées : résolues, plus abandonnées après un raté (sinon un
   * enfant qui quitte dès qu'il échoue afficherait 100 %). null sans manche tentée.
   */
  firstTryRate: number | null;
}

export interface PuzzleSummary {
  /** Une étoile, deux, trois, dans cet ordre. */
  byPreset: PresetSummary[];
  /** Plus haute difficulté où au moins une manche a été résolue ; null sans manche résolue. */
  highestSolved: PuzzlePreset | null;
}

export function summarizePuzzles(records: readonly PuzzleRecord[]): PuzzleSummary {
  const solvedRecords = records.filter((r) => r.outcome === 'solved');
  const byPreset = PUZZLE_PRESETS.map((preset): PresetSummary => {
    const rounds = solvedRecords.filter((r) => r.preset === preset);
    const firstTry = rounds.filter((r) => r.firstTry === true).length;
    const gaveUpAfterMiss = records.filter(
      (r) => r.preset === preset && r.status === 'abandoned' && r.misses > 0,
    ).length;
    const tried = rounds.length + gaveUpAfterMiss;
    return { preset, solved: rounds.length, firstTryRate: tried === 0 ? null : firstTry / tried };
  });
  const reached = byPreset.filter((p) => p.solved > 0);
  return { byPreset, highestSolved: reached.length === 0 ? null : reached[reached.length - 1]!.preset };
}
