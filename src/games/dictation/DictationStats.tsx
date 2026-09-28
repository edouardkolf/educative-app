// Bloc de statistiques de la dictée (docs/specs/DICTEE.md §5.3, arbitrage A7). Les indicateurs communs
// (parties, abandons, interruptions, temps de jeu…) sont affichés par ChildStats ; ce bloc n'ajoute que
// ce qui est propre à la dictée.
import { useEffect, useState } from 'preact/hooks';
import type { GameStatsProps } from '../index';
import type { DictationRecord } from '../../storage/dictations';
import { checkVoice, type VoiceCheck } from '../../ui/voice';
import { formatDuration, formatPercentage } from '../../parent/format';
import { DICTATION_SERIES } from './series';
import { computeDictationStats } from './stats';
import type { DictationWordStat, DictationWordStatus } from './stats';
import './dictation.css';

const STATUS_LABELS: Record<DictationWordStatus, string> = {
  fragile: 'Fragile',
  'in-progress': 'En cours',
  known: 'Su',
};

const VOICE_HINT_BY_PROBLEM: Record<string, string> = {
  muted: "Le son de l'application est coupé (onglet Réglages) : la dictée a besoin de la voix.",
  'no-api': 'Ce navigateur ne sait pas faire parler le téléphone : ouvrez l\'application avec Chrome.',
  'no-french-voice':
    'Aucune voix française : Paramètres Android › Accessibilité › Synthèse vocale, Français (France).',
  'no-offline-voice':
    'Voix française absente hors connexion : installez les données vocales Français (France).',
};

function voiceHint(check: VoiceCheck): string {
  if (check.status === 'muted') return VOICE_HINT_BY_PROBLEM.muted!;
  if (check.status === 'unavailable') return VOICE_HINT_BY_PROBLEM[check.problem ?? 'no-api']!;
  return check.voiceName ? `Voix : ${check.voiceName}.` : 'Voix prête.';
}

function seriesLabel(seriesId: string): string {
  const series = DICTATION_SERIES.find((s) => s.id === seriesId);
  return series ? `Série ${series.number}` : seriesId;
}

export function DictationStats({ records }: GameStatsProps<DictationRecord>) {
  const [voice, setVoice] = useState<VoiceCheck | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkVoice().then((check) => {
      if (!cancelled) setVoice(check);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = computeDictationStats(records, Date.now());

  return (
    <section className="pa-section" data-testid="dictation-stats">
      <h2 className="pa-section__title">Dictée quotidienne</h2>

      <p className={`pa-muted dict-stats__voice${voice && voice.status !== 'ready' ? ' dict-stats__voice--problem' : ''}`}>
        {voice ? voiceHint(voice) : 'Vérification de la voix…'}
      </p>

      <div className="pa-summary">
        <div className="pa-stat">
          <span className="pa-stat__value">{stats.wordsDictated}</span>
          <span className="pa-stat__label">Mots dictés</span>
        </div>
        <div className="pa-stat">
          <span className="pa-stat__value">{formatPercentage(stats.firstTryRate)}</span>
          <span className="pa-stat__label">Réussite au 1er coup</span>
        </div>
        <div className="pa-stat">
          <span className="pa-stat__value">
            {stats.replaysPerWord === null ? '—' : stats.replaysPerWord.toFixed(1)}
          </span>
          <span className="pa-stat__label">Réécoutes par mot</span>
        </div>
        <div className="pa-stat">
          <span className="pa-stat__value">
            {stats.medianAnswerMs === null ? '—' : formatDuration(stats.medianAnswerMs)}
          </span>
          <span className="pa-stat__label">Temps médian par mot</span>
        </div>
      </div>

      {stats.lastDictation && (
        <p className="pa-muted">
          Dernière dictée : {seriesLabel(stats.lastDictation.seriesId)}, {stats.lastDictation.firstTry} /{' '}
          {stats.lastDictation.total}.
        </p>
      )}

      {stats.fragileWords.length > 0 && (
        <div className="dict-stats__fragile">
          {stats.fragileWords.map((w) => (
            <span key={w.wordId} className="dict-stats__pill">
              {w.label}
              {w.wrongTypings.length > 0 ? ` — ${w.wrongTypings.join(', ')}` : ''}
            </span>
          ))}
        </div>
      )}

      {stats.bySeries.length > 0 && (
        <table className="dict-stats__table">
          <thead>
            <tr>
              <th>Série</th>
              <th>Dictées lancées</th>
              <th>Dernier score terminé</th>
            </tr>
          </thead>
          <tbody>
            {stats.bySeries.map((s) => (
              <tr key={s.seriesId}>
                <td>{seriesLabel(s.seriesId)}</td>
                <td>{s.launched}</td>
                <td>{s.lastCompletedScore ? `${s.lastCompletedScore.firstTry} / ${s.lastCompletedScore.total}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats.byWord.length > 0 && (
        <table className="dict-stats__table">
          <thead>
            <tr>
              <th>Mot</th>
              <th>Tentatives</th>
              <th>Justes au 1er coup</th>
              <th>Taux</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {stats.byWord.map((w: DictationWordStat) => (
              <tr key={w.wordId} data-testid={`dictation-word-${w.wordId}`} data-status={w.status}>
                <td>{w.label}</td>
                <td>{w.attempts}</td>
                <td>{w.firstTryCount}</td>
                <td>{formatPercentage(w.firstTryRate)}</td>
                <td>{STATUS_LABELS[w.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pa-help-box">
        <h3 className="pa-section__title">Comment lire ces chiffres</h3>
        <ul>
          <li><strong>Mots dictés</strong> : le nombre d'items, toutes dictées confondues.</li>
          <li><strong>Réussite au 1er coup</strong> : les mots trouvés dès la première validation, sans le hasard du clavier.</li>
          <li><strong>Réécoutes par mot</strong> : combien de fois elle redemande le mot ou la phrase, en moyenne.</li>
          <li><strong>Temps médian par mot</strong> : le temps typique pour valider un mot la première fois.</li>
          <li><strong>Mot fragile</strong> : la dernière tentative est fausse, ou au moins 2 des 3 dernières le sont.</li>
          <li><strong>Mot su</strong> : au moins 3 tentatives, et les 3 dernières justes du premier coup.</li>
        </ul>
      </div>
    </section>
  );
}
