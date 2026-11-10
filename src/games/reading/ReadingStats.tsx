// Bloc de statistiques « J'apprends à lire » (LECTURE.md §8.3). Les indicateurs communs sont affichés par ChildStats.
import { useMemo } from 'preact/hooks';
import type { GameStatsProps } from '..';
import type { ReadingRecord } from '../../storage/readings';
import { formatPercentage } from '../../parent/format';
import { VoiceBench } from './VoiceBench';
import { STAGE_TITLES, summarizeReading } from './stats';
import type { ReadingStatsSummary } from './stats';
import { READING_STAGES } from './types';
import './reading-parent.css';

const STATE_NAMES = { new: 'pas encore vu', learning: 'en cours', acquired: 'acquis' } as const;

export function ReadingStats({ profile, records }: GameStatsProps<ReadingRecord>) {
  const settings = profile.gameSettings?.reading;
  const summary = useMemo<ReadingStatsSummary | null>(() => {
    try {
      return summarizeReading(records, settings, Date.now());
    } catch {
      return null; // contenu pas encore prêt : on n'affiche que le banc d'écoute
    }
  }, [records, settings]);

  return (
    <section class="pa-section" data-testid="reading-stats">
      <h2 class="pa-section__title">J'apprends à lire</h2>
      {summary && (
        <>
          <div class="pa-summary">
            <div class="pa-stat">
              <span class="pa-stat__value" data-testid="reading-stats-stage">
                {summary.finished ? 'Terminé' : `${summary.stage} · ${STAGE_TITLES[summary.stage]}`}
              </span>
              <span class="pa-stat__label">Étape en cours</span>
            </div>
            <div class="pa-stat">
              <span class="pa-stat__value" data-testid="reading-stats-acquired">
                {summary.acquired} / {summary.gatedTotal}
              </span>
              <span class="pa-stat__label">Items acquis</span>
            </div>
            <div class="pa-stat">
              <span class="pa-stat__value" data-testid="reading-stats-sessions">
                {summary.sessionsCompleted}
              </span>
              <span class="pa-stat__label">Séances terminées</span>
            </div>
          </div>

          {summary.alerts.map((a) => (
            <p class="rp-alert" key={a.game} data-testid={`reading-stats-alert-${a.game}`}>
              <span class="rp-alert__title">À accompagner : {a.label}.</span> Elle semble répondre au hasard à ce jeu :
              restez à côté d'elle pour une séance.
            </p>
          ))}

          {READING_STAGES.map((stage) => {
            const items = summary.items.filter((i) => i.stage === stage);
            if (items.length === 0) return null;
            return (
              <div class="rp-stage" key={stage} data-testid={`reading-stats-grid-${stage}`}>
                <h3 class="rp-stage__title">
                  Étape {stage} · {STAGE_TITLES[stage]}
                </h3>
                <ul class="rp-items">
                  {items.map((i) => (
                    <li
                      key={i.itemId}
                      class={`rp-item${i.itemId.startsWith('k:') ? ' rp-item--wide' : ''}`}
                      data-state={i.state}
                      data-testid={`reading-stats-item-${i.itemId}`}
                      aria-label={`${i.label} : ${STATE_NAMES[i.state]}${i.rate === null ? '' : `, ${formatPercentage(i.rate)} du premier coup`}`}
                    >
                      <span class="rp-item__label">{i.label}</span>
                      <span class="rp-item__rate">{formatPercentage(i.rate)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div class="rp-legend">
            <span data-state="new"><i class="rp-item__dot" /> pas encore vu</span>
            <span data-state="learning"><i class="rp-item__dot" /> en cours</span>
            <span data-state="acquired"><i class="rp-item__dot" /> acquis</span>
            <span>% = réussite du premier coup</span>
          </div>

          <h3 class="rp-stage__title">Confusions les plus fréquentes</h3>
          {summary.confusions.length === 0 ? (
            <p class="pa-muted" data-testid="reading-stats-confusions-empty">Aucune confusion relevée pour l'instant.</p>
          ) : (
            <table class="rp-table" data-testid="reading-stats-confusions">
              <thead>
                <tr>
                  <th>Demandé</th>
                  <th>Choisi</th>
                  <th>Fois</th>
                </tr>
              </thead>
              <tbody>
                {summary.confusions.map((c) => (
                  <tr key={`${c.target}>${c.chosen}`}>
                    <td>{c.target}</td>
                    <td>{c.chosen}</td>
                    <td>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      <VoiceBench />
    </section>
  );
}
