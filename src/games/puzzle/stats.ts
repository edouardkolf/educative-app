// Indicateurs propres aux jeux libres de logique (docs/specs/JEUX-LOGIQUE.md §4). Les indicateurs communs
// sont calculés par parent/stats.ts. Fonction pure, testée sous Vitest.
import { PUZZLE_PRESETS } from '../../storage/puzzles';
import type { PuzzlePreset, PuzzleRecord } from '../../storage/puzzles';

export interface PresetSummary {
  preset: PuzzlePreset;
  /** Manches résolues à cette difficulté. */
  solved: number;
  /** Part des manches résolues du premier coup ; null sans manche résolue. */
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
    return { preset, solved: rounds.length, firstTryRate: rounds.length === 0 ? null : firstTry / rounds.length };
  });
  const reached = byPreset.filter((p) => p.solved > 0);
  return { byPreset, highestSolved: reached.length === 0 ? null : reached[reached.length - 1]!.preset };
}
