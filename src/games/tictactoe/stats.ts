// Indicateurs propres au morpion (docs/specs/MORPION-PENDU.md §5). Les indicateurs communs (parties,
// abandons, temps de jeu…) sont calculés par parent/stats.ts. Fonction pure, testée sous Vitest.
import type { TicTacToeLevel, TicTacToeRecord } from '../../storage/tictactoes';

export interface LevelSummary {
  level: TicTacToeLevel;
  /** Grilles terminées contre le téléphone à ce niveau. */
  grids: number;
  wins: number;
  losses: number;
  draws: number;
  /** Victoires / grilles ; null sans grille. */
  winRate: number | null;
}

export interface TicTacToeSummary {
  /** Facile, moyen, fort, dans cet ordre. Une grille solo sans niveau (avant les niveaux) compte en moyen. */
  byLevel: LevelSummary[];
  /** Niveau le plus élevé où l'enfant a gagné au moins une grille ; null sans victoire. */
  bestLevelWon: TicTacToeLevel | null;
  /** Grilles terminées à deux. */
  duoGrids: number;
}

const ORDER: readonly TicTacToeLevel[] = ['easy', 'medium', 'hard'];

export function summarizeTicTacToes(records: readonly TicTacToeRecord[]): TicTacToeSummary {
  const finished = records.filter((r) => r.outcome !== null);
  const solo = finished.filter((r) => r.mode === 'solo');
  const byLevel = ORDER.map((level): LevelSummary => {
    const grids = solo.filter((r) => (r.level ?? 'medium') === level);
    const wins = grids.filter((r) => r.outcome === 'x').length;
    return {
      level,
      grids: grids.length,
      wins,
      losses: grids.filter((r) => r.outcome === 'o').length,
      draws: grids.filter((r) => r.outcome === 'draw').length,
      winRate: grids.length === 0 ? null : wins / grids.length,
    };
  });
  const won = byLevel.filter((l) => l.wins > 0);
  return {
    byLevel,
    bestLevelWon: won.length === 0 ? null : won[won.length - 1]!.level,
    duoGrids: finished.filter((r) => r.mode === 'duo').length,
  };
}
