// Bloc de statistiques du morpion (docs/specs/MORPION-PENDU.md §5, arbitrage A7). Les indicateurs communs
// sont affichés par ChildStats ; ce bloc n'ajoute que ce qui est propre au morpion.
import type { GameStatsProps } from '../index';
import type { TicTacToeRecord } from '../../storage/tictactoes';
import { formatPercentage } from '../../parent/format';
import { summarizeTicTacToes } from './stats';

export function TicTacToeStats({ records }: GameStatsProps<TicTacToeRecord>) {
  const s = summarizeTicTacToes(records);
  return (
    <section class="pa-section" data-testid="tictactoe-stats">
      <div class="pa-summary">
        <div class="pa-stat">
          <span class="pa-stat__value" data-testid="tictactoe-stats-solo">
            {s.soloWins} / {s.soloLosses} / {s.soloDraws}
          </span>
          <span class="pa-stat__label">Contre le téléphone : gagnées / perdues / nulles</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{formatPercentage(s.soloWinRate)}</span>
          <span class="pa-stat__label">Victoires contre le téléphone</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{s.duoGrids}</span>
          <span class="pa-stat__label">Grilles jouées à deux</span>
        </div>
      </div>
      <p class="pa-muted">
        Une partie = une grille. Le téléphone gagne dès qu'il le peut mais ne bloque qu'environ 3 fois sur 4 : il
        reste battable.
      </p>
    </section>
  );
}
