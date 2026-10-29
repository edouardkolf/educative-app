// Bloc de statistiques du morpion (docs/specs/MORPION-PENDU.md §5, arbitrage A7). Les indicateurs communs
// sont affichés par ChildStats ; ce bloc n'ajoute que ce qui est propre au morpion.
import type { GameStatsProps } from '../index';
import type { TicTacToeLevel, TicTacToeRecord } from '../../storage/tictactoes';
import { formatPercentage } from '../../parent/format';
import { summarizeTicTacToes } from './stats';

export const LEVEL_LABELS: Record<TicTacToeLevel, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Fort' };

export function TicTacToeStats({ records }: GameStatsProps<TicTacToeRecord>) {
  const s = summarizeTicTacToes(records);
  return (
    <section class="pa-section" data-testid="tictactoe-stats">
      <div class="pa-summary">
        <div class="pa-stat">
          <span class="pa-stat__value" data-testid="tictactoe-stats-best">
            {s.bestLevelWon ? LEVEL_LABELS[s.bestLevelWon] : '—'}
          </span>
          <span class="pa-stat__label">Plus haut niveau battu</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{s.duoGrids}</span>
          <span class="pa-stat__label">Grilles jouées à deux</span>
        </div>
      </div>
      <table class="pa-activity-table" data-testid="tictactoe-stats-levels">
        <thead>
          <tr>
            <th scope="col">Contre le téléphone</th>
            <th scope="col">Gagnées / perdues / nulles</th>
            <th scope="col">Victoires</th>
          </tr>
        </thead>
        <tbody>
          {s.byLevel.map((l) => (
            <tr key={l.level}>
              <th scope="row">{LEVEL_LABELS[l.level]}</th>
              <td data-testid={`tictactoe-level-${l.level}`}>
                {l.wins} / {l.losses} / {l.draws}
              </td>
              <td>{formatPercentage(l.winRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="pa-muted">
        Une partie = une grille. L'enfant choisit le niveau ; « Facile » est présélectionné et montre en clignotant
        l'alignement à bloquer. « Fort » joue parfaitement : le mieux possible est l'égalité.
      </p>
    </section>
  );
}
