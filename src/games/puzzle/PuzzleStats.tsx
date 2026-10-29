// Bloc de statistiques des jeux libres de logique (docs/specs/JEUX-LOGIQUE.md §4). Les indicateurs communs
// sont affichés par ChildStats ; ce bloc n'ajoute que la répartition par difficulté.
import type { GameStatsProps } from '../index';
import type { PuzzlePreset, PuzzleRecord } from '../../storage/puzzles';
import { formatPercentage } from '../../parent/format';
import { summarizePuzzles } from './stats';

export const PRESET_LABELS: Record<PuzzlePreset, string> = {
  easy: '1 étoile',
  medium: '2 étoiles',
  hard: '3 étoiles',
};

export function PuzzleStats({ records }: GameStatsProps<PuzzleRecord>) {
  const s = summarizePuzzles(records);
  return (
    <section class="pa-section" data-testid="puzzle-stats">
      <div class="pa-summary">
        <div class="pa-stat">
          <span class="pa-stat__value" data-testid="puzzle-stats-best">
            {s.highestSolved ? PRESET_LABELS[s.highestSolved] : '—'}
          </span>
          <span class="pa-stat__label">Plus haute difficulté réussie</span>
        </div>
      </div>
      <table class="pa-activity-table" data-testid="puzzle-stats-presets">
        <thead>
          <tr>
            <th scope="col">Difficulté</th>
            <th scope="col">Manches résolues</th>
            <th scope="col">Du premier coup</th>
          </tr>
        </thead>
        <tbody>
          {s.byPreset.map((p) => (
            <tr key={p.preset}>
              <th scope="row">{PRESET_LABELS[p.preset]}</th>
              <td data-testid={`puzzle-preset-${p.preset}`}>{p.solved}</td>
              <td>{formatPercentage(p.firstTryRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="pa-muted">
        Une partie = une manche (un nombre, un code ou un trajet). L'enfant choisit la difficulté ; une étoile est
        présélectionnée. « Du premier coup » : la manche est résolue sans aucune erreur.
      </p>
    </section>
  );
}
