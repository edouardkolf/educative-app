// Statistiques d'un enfant : résumé global, bilan par compétence ou par jeu, puis une carte par niveau du parcours (ARCHITECTURE §7).
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { chanceOfFirstTry, computeLevelStates, computeLevelStats, getLevel, getTrackOrDefault } from '../engine';
import type { LevelStats, LevelStatus, MechanicId, SkillId } from '../engine';
import { getProfile, listOverrides, listRuns, setOverride } from '../storage';
import type { LevelOverride, Profile } from '../storage';
import { formatDateTime, formatDuration, formatPercentage } from './format';
import { CHANCE_SCORE, MIN_ROUNDS_FOR_VERDICT, summarizeByGroup, summarizeRuns } from './stats';
import type { GroupLevel, GroupSummary, RunsSummary, SkillVerdict } from './stats';
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
  'color-mixing': 'Couleurs',
  shapes: 'Formes',
};

const MECHANIC_LABELS: Record<MechanicId, string> = {
  sequence: 'Suites',
  count: 'Compter',
  'odd-one-out': "Trouver l'intrus",
  'color-mix': 'Labo des couleurs',
  sort: 'Trieur magique',
  builder: 'Constructeur',
};

type GroupBy = 'skill' | 'mechanic';

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  skill: 'Par compétence',
  mechanic: 'Par jeu',
};

const VERDICT_LABELS: Record<SkillVerdict, string> = {
  strong: 'Point fort',
  ok: 'En cours',
  weak: 'À consolider',
  'too-few': 'Pas assez joué',
  'not-played': 'Pas encore joué',
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
  mechanic: MechanicId | null;
  chance: number;
  status: LevelStatus;
  stats: LevelStats;
  override: OverrideState;
}

interface StatsData {
  profile: Profile;
  trackTitle: string;
  levels: LevelRow[];
  summary: RunsSummary;
  skills: GroupSummary<SkillId>[];
  games: GroupSummary<MechanicId>[];
}

async function loadStats(profileId: string): Promise<StatsData> {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error('Cet enfant est introuvable.');

  const [runs, overrides] = await Promise.all([listRuns(profileId), listOverrides(profileId)]);

  const track = getTrackOrDefault(profile.trackId); // F11 : parcours inconnu → premier disponible
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
      mechanic: level?.mechanic ?? null,
      chance: level ? chanceOfFirstTry(level) : 0,
      status,
      stats: computeLevelStats(levelId, runs),
      override: overrideByLevel.get(levelId) ?? null,
    };
  });

  const groupLevels = <G extends string>(key: (l: LevelRow) => G | null): Array<GroupLevel & { group: G }> =>
    levels.flatMap((l) => {
      const group = key(l);
      return group ? [{ levelId: l.levelId, group, completed: l.status === 'completed', chance: l.chance }] : [];
    });

  return {
    profile,
    trackTitle,
    levels,
    summary: summarizeRuns(runs),
    skills: summarizeByGroup(runs, groupLevels((l) => l.skill)),
    games: summarizeByGroup(runs, groupLevels((l) => l.mechanic)),
  };
}

export function ChildStats(props: { profileId: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overridePending, setOverridePending] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('skill');

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

  const { profile, trackTitle, levels, summary, skills, games } = data;
  const groups: Array<{ key: string; label: string; testId: string; summary: GroupSummary }> =
    groupBy === 'skill'
      ? skills.map((g) => ({ key: g.group, label: SKILL_LABELS[g.group], testId: `skill-${g.group}`, summary: g }))
      : games.map((g) => ({ key: g.group, label: MECHANIC_LABELS[g.group], testId: `game-${g.group}`, summary: g }));

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

      <section className="pa-section" data-testid="skill-stats">
        <h2 className="pa-section__title">Points forts et points à travailler</h2>
        <div className="pa-segmented" role="group" aria-label="Regrouper">
          {(['skill', 'mechanic'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              className="pa-segmented__option"
              data-testid={`group-by-${choice}`}
              aria-pressed={groupBy === choice}
              onClick={() => setGroupBy(choice)}
            >
              {GROUP_BY_LABELS[choice]}
            </button>
          ))}
        </div>
        <p className="pa-muted">
          Du mieux au moins bien réussi du premier coup, une fois retirée la part que donnerait le hasard.
        </p>
        <ul className="pa-skill-list">
          {groups.map((g) => (
            <GroupRow key={g.key} label={g.label} testId={g.testId} summary={g.summary} />
          ))}
        </ul>
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
            <strong>Points forts et points à travailler</strong> : les manches de tous les niveaux d'une même compétence
            (ou d'un même jeu), mises ensemble. En dessous de {MIN_ROUNDS_FOR_VERDICT} manches, on ne conclut pas.
          </li>
          <li>
            <strong>Part du hasard</strong> (zone hachurée) : en tapant au hasard, on trouve déjà parfois la bonne
            réponse, une fois sur deux s'il n'y a que 2 choix, une fois sur quatre s'il y en a 4. Seule la partie de la
            barre au-delà de cette zone montre ce que l'enfant sait vraiment : c'est elle qui décide du classement. Sur
            un jeu à 3 choix, « point fort » correspond à environ 80 % de réussite, « à consolider » à moins de 60 %.
          </li>
          <li>
            Les niveaux d'une compétence deviennent plus difficiles au fil du parcours : un taux qui baisse alors que
            les niveaux réussis augmentent, c'est souvent le signe qu'elle avance, pas qu'elle recule.
          </li>
          <li>
            <strong>Temps médian</strong> : le temps typique pour trouver la bonne réponse. La médiane ne tient pas
            compte des manches où l'enfant a été distrait.
          </li>
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

function GroupRow(props: { label: string; testId: string; summary: GroupSummary }) {
  const { label, testId } = props;
  const { verdict, firstTryRate, chanceRate, score, roundsPlayed, levels, levelsCompleted, medianRoundMs } =
    props.summary;
  const readable = verdict !== 'too-few' && verdict !== 'not-played';
  const percent = firstTryRate === null ? 0 : Math.round(firstTryRate * 100);
  const chancePercent = chanceRate === null ? 0 : Math.round(chanceRate * 100);
  // Chaque fragment reste sur une ligne (« 6 s » ne se coupe pas) ; le retour à la ligne se fait entre eux.
  const details = [
    `${levelsCompleted} niveau${levelsCompleted > 1 ? 'x' : ''} réussi${levelsCompleted > 1 ? 's' : ''} sur ${levels}`,
    `${roundsPlayed} manche${roundsPlayed > 1 ? 's' : ''}`,
    ...(medianRoundMs !== null ? [`${formatDuration(medianRoundMs)} par manche`] : []),
    ...(readable && chanceRate !== null ? [`hasard : ${formatPercentage(chanceRate)}`] : []),
    ...(verdict === 'too-few' ? [`${formatPercentage(firstTryRate)} pour l'instant`] : []),
  ];
  return (
    <li className={`pa-skill pa-skill--${verdict}`} data-testid={testId}>
      <div className="pa-skill__header">
        <h3 className="pa-skill__name">{label}</h3>
        <span className={`pa-badge pa-badge--${verdict}`}>{VERDICT_LABELS[verdict]}</span>
      </div>
      <div className="pa-skill__rate">
        <div
          className="pa-meter"
          role="meter"
          aria-label={`Réussite au premier coup en ${label}, dont ${chancePercent} % que donnerait le hasard`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="pa-meter__fill" style={{ width: `${percent}%` }} />
          {readable && chancePercent > 0 && (
            <span className="pa-meter__chance" style={{ width: `${Math.min(percent, chancePercent)}%` }} />
          )}
        </div>
        <span className="pa-skill__percent">{readable ? formatPercentage(firstTryRate) : formatPercentage(null)}</span>
      </div>
      <p className="pa-skill__details">
        {details.map((part, i) => (
          <Fragment key={part}>
            {i > 0 && ' · '}
            <span>{part}</span>
          </Fragment>
        ))}
      </p>
      {readable && score !== null && score < CHANCE_SCORE && (
        <p className="pa-skill__warning">
          Pour l'instant, pas mieux que des réponses données au hasard.
        </p>
      )}
    </li>
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
