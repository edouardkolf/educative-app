// Bloc de statistiques du coloriage magique (docs/specs/COLORIAGE.md §5.4, §6.3, cadre A7). Les
// indicateurs communs (parties, abandons, interruptions, temps de jeu…) sont affichés par ChildStats ;
// ce bloc ne montre que ce qui est propre au coloriage : des dessins (chaînes), pas des séances.
import type { GameStatsProps } from '../index';
import type { ColoringRecord } from '../../storage/colorings';
import { formatDuration, formatPercentage } from '../../parent/format';
import { currentTier } from './progression';
import { summarizeColorings } from './stats';

const TIER_LABELS: Record<number, string> = { 1: 'Goutte', 2: 'Objet', 3: 'Formes', 4: 'Dé' };

export function ColoringStats({ profile, records }: GameStatsProps<ColoringRecord>) {
  const summary = summarizeColorings(records);
  const tier = currentTier(records, profile.gameSettings?.coloring?.tier);

  return (
    <section class="pa-section" data-testid="coloring-stats">
      <h2 class="pa-section__title">Coloriage magique</h2>

      <p class="pa-muted">
        Palier actuel : <strong>{TIER_LABELS[tier]}</strong>
        {profile.gameSettings?.coloring?.tier ? ' (fixé par le parent)' : ' (automatique)'}
      </p>

      <div class="pa-summary">
        <div class="pa-stat">
          <span class="pa-stat__value" data-testid="coloring-stats-started">
            {summary.drawingsStarted}
          </span>
          <span class="pa-stat__label">Dessins commencés</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value" data-testid="coloring-stats-completed">
            {summary.drawingsCompleted}
          </span>
          <span class="pa-stat__label">Dessins terminés</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{summary.drawingsUnfinished}</span>
          <span class="pa-stat__label">Dessins inachevés</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">
            {summary.medianTimePerDrawingMs === null ? '—' : formatDuration(summary.medianTimePerDrawingMs)}
          </span>
          <span class="pa-stat__label">Temps médian par dessin</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{formatPercentage(summary.firstTryRate)}</span>
          <span class="pa-stat__label">Réussite au 1er coup</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{formatPercentage(summary.handHelpRate)}</span>
          <span class="pa-stat__label">Aide de la main</span>
        </div>
      </div>

      {summary.recipes.length > 0 && (
        <table class="dict-stats__table">
          <thead>
            <tr>
              <th>Couleur</th>
              <th>Essais</th>
              <th>Réussite</th>
              <th>Confusion</th>
            </tr>
          </thead>
          <tbody>
            {summary.recipes.map((r) => (
              <tr key={r.color}>
                <td>{r.color}</td>
                <td>{r.attempts}</td>
                <td>{formatPercentage(r.successRate)}</td>
                <td>{r.confusion ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary.byTier.length > 0 && (
        <table class="dict-stats__table">
          <thead>
            <tr>
              <th>Palier</th>
              <th>Dessins terminés</th>
              <th>Réussite au 1er coup</th>
            </tr>
          </thead>
          <tbody>
            {summary.byTier.map((t) => (
              <tr key={t.tier}>
                <td>{TIER_LABELS[t.tier]}</td>
                <td>{t.completed}</td>
                <td>{formatPercentage(t.firstTryRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div class="pa-help-box">
        <h3 class="pa-section__title">Comment lire ces chiffres</h3>
        <ul>
          <li><strong>Dessin</strong> : une chaîne de parties (une reprise ne compte pas un nouveau dessin).</li>
          <li><strong>Réussite au 1er coup</strong> : la bonne couleur dès le premier essai sur une case, sur toute la chaîne.</li>
          <li>
            <strong>Recette</strong> : jugée sur le premier mélange posé sur une case de cette couleur ; « Confusion »
            montre la couleur posée à tort si elle revient au moins deux fois.
          </li>
          <li><strong>Aide de la main</strong> : la part des cases où l'enfant a eu besoin de l'aide la plus poussée.</li>
        </ul>
      </div>
    </section>
  );
}
