// Statistiques d'un enfant : résumé global puis une carte par niveau du parcours (ARCHITECTURE §7).
import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { computeLevelStates, computeLevelStats, getLevel, getTrack } from '../engine';
import type { LevelStats, LevelStatus, SkillId } from '../engine';
import { getProfile, listOverrides, listRuns, setOverride } from '../storage';
import type { LevelOverride, Profile } from '../storage';
import { formatDateTime, formatDuration, formatPercentage } from './format';
import { summarizeRuns } from './stats';
import type { RunsSummary } from './stats';
import { describeError } from './util';

type OverrideState = LevelOverride['state'] | null;

const OVERRIDE_LABELS: Record<'auto' | LevelOverride['state'], string> = {
  auto: 'Auto',
  unlocked: 'Débloqué',
  locked: 'Verrouillé',
};

const SKILL_LABELS: Record<SkillId, string> = {
  patterns: 'Suites et rythmes',
  counting: 'Dénombrement',
  'visual-discrimination': 'Repérer une différence',
  categorization: 'Catégoriser',
};

const STATUS_LABELS: Record<LevelStatus, string> = {
  locked: 'Verrouillé',
  unlocked: 'Débloqué',
  completed: 'Réussi',
};

interface LevelRow {
  levelId: string;
  title: string;
  skill: SkillId | null;
  status: LevelStatus;
  stats: LevelStats;
  override: OverrideState;
}

interface StatsData {
  profile: Profile;
  trackTitle: string;
  levels: LevelRow[];
  summary: RunsSummary;
}

async function loadStats(profileId: string): Promise<StatsData> {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error('Cet enfant est introuvable.');

  const [runs, overrides] = await Promise.all([listRuns(profileId), listOverrides(profileId)]);

  const track = getTrack(profile.trackId);
  const trackTitle = track?.title ?? profile.trackId;
  const levelIds = track?.levels ?? [];
  const states = track ? computeLevelStates(track, runs, overrides) : [];
  const overrideByLevel = new Map(overrides.map((o) => [o.levelId, o.state]));

  const levels: LevelRow[] = levelIds.map((levelId) => {
    const level = getLevel(levelId);
    const status = states.find((s) => s.levelId === levelId)?.status ?? 'locked';
    return {
      levelId,
      title: level?.title ?? levelId,
      skill: level?.skill ?? null,
      status,
      stats: computeLevelStats(levelId, runs),
      override: overrideByLevel.get(levelId) ?? null,
    };
  });

  return { profile, trackTitle, levels, summary: summarizeRuns(runs) };
}

export function ChildStats(props: { profileId: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overridePending, setOverridePending] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    loadStats(props.profileId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [props.profileId]);

  async function handleOverrideChange(levelId: string, state: OverrideState) {
    setOverridePending(levelId);
    setOverrideError(null);
    try {
      await setOverride(props.profileId, levelId, state);
      const result = await loadStats(props.profileId);
      setData(result);
    } catch (err) {
      setOverrideError(describeError(err));
    } finally {
      setOverridePending(null);
    }
  }

  if (error) {
    return (
      <div className="pa-space">
        <p className="pa-error">{error}</p>
        <BackButton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pa-space">
        <p className="pa-muted">Chargement…</p>
      </div>
    );
  }

  const { profile, trackTitle, levels, summary } = data;

  return (
    <div className="pa-space">
      <header className="pa-header pa-stats-header">
        <span className="pa-stats-header__avatar" aria-hidden="true">
          {profile.avatar}
        </span>
        <div>
          <h1>{profile.name}</h1>
          <p className="pa-muted">{trackTitle}</p>
        </div>
      </header>

      <section className="pa-section pa-summary">
        <div className="pa-stat">
          <span className="pa-stat__value">{summary.totalRuns}</span>
          <span className="pa-stat__label">Parties lancées</span>
        </div>
        <div className="pa-stat">
          <span className="pa-stat__value">{formatPercentage(summary.firstTryRate)}</span>
          <span className="pa-stat__label">Réussite au 1er coup</span>
        </div>
        <div className="pa-stat">
          <span className="pa-stat__value">{formatDuration(summary.playTimeMs)}</span>
          <span className="pa-stat__label">Temps de jeu total</span>
        </div>
      </section>

      <section className="pa-section">
        <h2 className="pa-section__title">Niveaux</h2>
        {overrideError && (
          <p className="pa-error" role="alert">
            {overrideError}
          </p>
        )}
        <div className="pa-level-list">
          {levels.map((level) => (
            <article key={level.levelId} className="pa-level-card" data-testid={`level-stats-${level.levelId}`}>
              <div className="pa-level-card__header">
                <div>
                  <h3 className="pa-level-card__title">{level.title}</h3>
                  <p className="pa-level-card__skill">{level.skill ? SKILL_LABELS[level.skill] : '—'}</p>
                </div>
                <span className={`pa-badge pa-badge--${level.status}`}>{STATUS_LABELS[level.status]}</span>
              </div>

              <Stars count={level.stats.bestStars} />

              <dl className="pa-stat-grid">
                <div className="pa-stat-grid__item">
                  <dt>Essais</dt>
                  <dd>{level.stats.runs}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Réussites</dt>
                  <dd>{level.stats.completed}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Abandons</dt>
                  <dd>{level.stats.abandoned}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Interruptions</dt>
                  <dd>{level.stats.interrupted}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Rejeux</dt>
                  <dd>{level.stats.replays}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Taux de réussite</dt>
                  <dd>{formatPercentage(level.stats.firstTryRate)}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Temps de jeu</dt>
                  <dd>{formatDuration(level.stats.playTimeMs)}</dd>
                </div>
                <div className="pa-stat-grid__item">
                  <dt>Dernière partie</dt>
                  <dd>{formatDateTime(level.stats.lastPlayedAt)}</dd>
                </div>
              </dl>

              <p className="pa-field__label">Déblocage</p>
              <div className="pa-segmented" role="group" aria-label={`Déblocage de ${level.title}`}>
                {(['auto', 'unlocked', 'locked'] as const).map((choice) => {
                  const state: OverrideState = choice === 'auto' ? null : choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      className="pa-segmented__option"
                      data-testid={`override-${level.levelId}-${choice}`}
                      aria-pressed={level.override === state}
                      disabled={overridePending === level.levelId}
                      onClick={() => handleOverrideChange(level.levelId, state)}
                    >
                      {OVERRIDE_LABELS[choice]}
                    </button>
                  );
                })}
              </div>
              <p className="pa-muted">« Auto » suit la règle des étoiles.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pa-help-box">
        <h2 className="pa-section__title">Comment lire ces chiffres</h2>
        <ul>
          <li>
            <strong>Essais</strong> : le nombre de fois où ce niveau a été lancé.
          </li>
          <li>
            <strong>Réussites</strong> : les parties où toutes les manches ont été résolues.
          </li>
          <li>
            <strong>Taux de réussite</strong> : la part des manches réussies dès le premier essai — ça mesure la
            maîtrise, pas la persévérance, puisque l'enfant réessaie toujours jusqu'à trouver.
          </li>
          <li>
            <strong>Abandons</strong> : les parties quittées avant la fin (bouton maison ou application fermée).
          </li>
          <li>
            <strong>Interruptions</strong> : les parties coupées par le minuteur ou le quota — ce n'est pas un
            abandon.
          </li>
          <li>
            <strong>Rejeux</strong> : les parties relancées sur un niveau déjà réussi, par envie d'y rejouer.
          </li>
          <li>
            <strong>Étoiles</strong> : le meilleur résultat obtenu sur ce niveau.
          </li>
          <li>
            <strong>Temps de jeu</strong> : le temps passé activement à jouer les manches de ce niveau.
          </li>
        </ul>
      </section>

      <BackButton />
    </div>
  );
}

function BackButton() {
  return (
    <button
      type="button"
      className="pa-button pa-button--ghost"
      onClick={() => navigate({ name: 'parent', path: [] })}
    >
      ← Tableau de bord
    </button>
  );
}

function Stars(props: { count: 0 | 1 | 2 | 3 }) {
  const { count } = props;
  return (
    <div className="pa-stars" role="img" aria-label={`${count} étoile${count > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`pa-star${i <= count ? ' pa-star--filled' : ''}`} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}
