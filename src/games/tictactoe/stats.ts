// Indicateurs propres au morpion (docs/specs/MORPION-PENDU.md §5). Les indicateurs communs (parties,
// abandons, temps de jeu…) sont calculés par parent/stats.ts. Fonction pure, testée sous Vitest.
import type { TicTacToeRecord } from '../../storage/tictactoes';

export interface TicTacToeSummary {
  /** Grilles terminées contre le téléphone. */
  soloGrids: number;
  soloWins: number;
  soloLosses: number;
  soloDraws: number;
  /** Victoires / grilles terminées contre le téléphone ; null sans grille. */
  soloWinRate: number | null;
  /** Grilles terminées à deux. */
  duoGrids: number;
}

export function summarizeTicTacToes(records: readonly TicTacToeRecord[]): TicTacToeSummary {
  const finished = records.filter((r) => r.outcome !== null);
  const solo = finished.filter((r) => r.mode === 'solo');
  const soloWins = solo.filter((r) => r.outcome === 'x').length;
  return {
    soloGrids: solo.length,
    soloWins,
    soloLosses: solo.filter((r) => r.outcome === 'o').length,
    soloDraws: solo.filter((r) => r.outcome === 'draw').length,
    soloWinRate: solo.length === 0 ? null : soloWins / solo.length,
    duoGrids: finished.filter((r) => r.mode === 'duo').length,
  };
}
