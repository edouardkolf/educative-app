// Statistiques d'un enfant : résumé global, temps par activité, bilan de chaque jeu libre, puis la
// carte du parcours (bilan par compétence ou par jeu, une carte par niveau — ARCHITECTURE §7, HUB.md §5.5/§6.4).
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { chanceOfFirstTry, computeLevelStates, computeLevelStats, getLevel, getTrackOrDefault } from '../engine';
import type { LevelStats, LevelStatus, MechanicId, SkillId } from '../engine';
import { GAMES, visibleGameIds } from '../games';
import { ColoringStats } from '../games/coloring/ColoringStats';
import { DictationStats } from '../games/dictation/DictationStats';
import { dayKey, getProfile, listColorings, listDictations, listOverrides, listRuns, listUsage, setOverride } from '../storage';
import type { ColoringRecord, DictationRecord, GameRecordBase, LevelOverride, Profile, UsageDay } from '../storage';
import { Emoji } from '../ui/Emoji';
import { Icon } from '../ui/icons/Icon';
import { BackToChildren } from './ParentShell';
import { formatDateTime, formatDuration, formatPercentage } from './format';
import {
  CHANCE_SCORE,
  MIN_ROUNDS_FOR_VERDICT,
  summarizeActivityTime,
  summarizeByGroup,
  summarizeGameRecords,
  summarizeRuns,
  totalActivitySeconds,
} from './stats';
import type { ActivityTotals, GroupLevel, GroupSummary, RunsSummary, SkillVerdict } from './stats';
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
  comparison: 'Comparer les nombres',
  addition: 'Addition',
  subtraction: 'Soustraction',
  multiplication: 'Tables de multiplication',
  spelling: 'Orthographe',
  reading: 'Lecture',
};

const MECHANIC_LABELS: Record<MechanicId, string> = {
  sequence: 'Suites',
  count: 'Compter',
  'odd-one-out': "Trouver l'intrus",
  'color-mix': 'Labo des couleurs',
  sort: 'Trieur magique',
  builder: 'Constructeur',
  compare: 'Plus grand, plus petit',
  calc: 'Calcul',
  spelling: 'Mots invariables',
  read: 'Lis et montre',
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
  dictations: DictationRecord[];
  colorings: ColoringRecord[];
  usageDays: UsageDay[];
}

async function loadStats(profileId: string): Promise<StatsData> {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error('Cet enfant est introuvable.');

  const [runs, overrides, dictations, colorings, usageDays] = await Promise.all([
    listRuns(profileId),
    listOverrides(profileId),
    listDictations(profileId),
    listColorings(profileId),
    listUsage(profileId),
  ]);

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
    dictations,
    colorings,
    usageDays,
  };
}

/** Libellé d'une ligne du tableau « Temps par activité » (HUB.md §6.4). */
function activityRowLabel(id: string): string {
  if (id === 'map') return 'Carte';
  if (id === 'hub') return 'Accueil';
  if (id === 'total') return 'Total';
  return GAMES.find((game) => game.id === id)?.parentLabel ?? id;
}

/** Secondes de `id` dans `totals` ; le total additionne toutes les activités (§5.5 : = Σ activeSeconds). */
function activitySeconds(totals: ActivityTotals, id: string): number {
  return id === 'total' ? totalActivitySeconds(totals) : (totals[id] ?? 0);
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
        <BackToChildren />
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

  const { profile, trackTitle, levels, summary, skills, games, dictations, colorings, usageDays } = data;
  const groups: Array<{ key: string; label: string; testId: string; summary: GroupSummary }> =
    groupBy === 'skill'
      ? skills.map((g) => ({ key: g.group, label: SKILL_LABELS[g.group], testId: `skill-${g.group}`, summary: g }))
      : games.map((g) => ({ key: g.group, label: MECHANIC_LABELS[g.group], testId: `game-${g.group}`, summary: g }));

  // Cadre A8 : « Temps de jeu total » = niveaux (summary.playTimeMs) + Σ activeMs des parties de jeu.
  const freeGamesActiveMs = [...dictations, ...colorings].reduce((sum, r) => sum + r.activeMs, 0);

  const activityTime = summarizeActivityTime(usageDays, dayKey());
  const visibleGames = new Set(visibleGameIds(profile));
  // Lignes du tableau : la carte, puis les jeux visibles ou joués cette semaine, l'accueil, le total.
  const activityGameIds = GAMES.filter(
    (game) => visibleGames.has(game.id) || (activityTime.week[game.id] ?? 0) > 0,
  ).map((game) => game.id);
  const activityRowIds = ['map', ...activityGameIds, 'hub', 'total'];

  // Une section par jeu visible ou ayant au moins une partie (arbitrage A7/A8, HUB.md §6.4).
  const gameSections = GAMES.flatMap((game) => {
    const records: readonly GameRecordBase[] = game.id === 'dictation' ? dictations : colorings;
    if (!visibleGames.has(game.id) && records.length === 0) return [];
    return [{ game, records }];
  });

  return (
    <div className="pa-space">
      <BackToChildren />
      <header className="pa-header pa-stats-header">
        <span className="pa-stats-header__avatar" aria-hidden="true">
          <Emoji char={profile.avatar} />
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
          <span className="pa-stat__value">{formatDuration(summary.playTimeMs + freeGamesActiveMs)}</span>
          <span className="pa-stat__label">Temps de jeu total</span>
        </div>
      </section>

      <section className="pa-section" data-testid="activity-time">
        <h2 className="pa-section__title">Temps par activité</h2>
        <table className="pa-activity-table">
          <thead>
            <tr>
              <th scope="col">Activité</th>
              <th scope="col">Aujourd'hui</th>
              <th scope="col">7 derniers jours</th>
            </tr>
          </thead>
          <tbody>
            {activityRowIds.map((id) => (
              <tr key={id} className={id === 'total' ? 'pa-activity-table__total' : undefined}>
                <th scope="row">{activityRowLabel(id)}</th>
                <td data-testid={`activity-${id}-today`}>
                  {formatDuration(activitySeconds(activityTime.today, id) * 1000)}
                </td>
                <td data-testid={`activity-${id}-week`}>
                  {formatDuration(activitySeconds(activityTime.week, id) * 1000)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {gameSections.map(({ game, records }) => {
        const gameSummary = summarizeGameRecords(records, Date.now());
        return (
          <section key={game.id} className="pa-section" data-testid={`game-stats-${game.id}`}>
            <h2 className="pa-section__title">{game.parentLabel}</h2>
            <dl className="pa-stat-grid">
              <div className="pa-stat-grid__item">
                <dt>Parties</dt>
                <dd>{gameSummary.total}</dd>
              </div>
              <div className="pa-stat-grid__item">
                <dt>Terminées</dt>
                <dd>{gameSummary.completed}</dd>
              </div>
              <div className="pa-stat-grid__item">
                <dt>Abandons</dt>
                <dd>{gameSummary.abandoned}</dd>
              </div>
              <div className="pa-stat-grid__item">
                <dt>Interruptions</dt>
                <dd>{gameSummary.interrupted}</dd>
              </div>
              <div className="pa-stat-grid__item">
                <dt>Temps de jeu</dt>
                <dd>{formatDuration(gameSummary.activeMs)}</dd>
              </div>
              <div className="pa-stat-grid__item">
                <dt>Jours joués (7 j)</dt>
                <dd>{gameSummary.daysPlayedInWeek}</dd>
              </div>
              <div className="pa-stat-grid__item">
                <dt>Dernière partie</dt>
                <dd>{formatDateTime(gameSummary.lastPlayedAt)}</dd>
              </div>
            </dl>
            {game.id === 'dictation' ? (
              <DictationStats profile={profile} records={records as DictationRecord[]} />
            ) : (
              <ColoringStats profile={profile} records={records as ColoringRecord[]} />
            )}
          </section>
        );
      })}

      <h2 className="pa-section__title">Carte du parcours</h2>

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
                  <dt>Vies perdues</dt>
                  <dd>{level.stats.outOfLives}</dd>
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
            maîtrise, pas la persévérance, puisque l'enfant peut réessayer jusqu'à trouver.
          </li>
          <li>
            <strong>Abandons</strong> : les parties quittées avant la fin (bouton maison ou application fermée).
          </li>
          <li>
            <strong>Interruptions</strong> : les parties coupées par le minuteur ou le quota — ce n'est pas un
            abandon.
          </li>
          <li>
            <strong>Vies perdues</strong> : les parties arrêtées parce que l'enfant a raté trop de manches (une vie
            en moins par manche ratée du premier coup). Souvent de la fatigue : c'est le signal d'une pause.
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
          <li>
            <strong>Temps par activité</strong> : le temps compté par les minuteurs, réparti par écran (Accueil,
            Carte, Dictée, Coloriage), aujourd'hui et sur les 7 derniers jours. Le temps d'avant l'ajout des jeux
            libres reste compté dans « Carte ».
          </li>
          <li>
            Pour chaque jeu libre : <strong>Parties</strong> compte tous les lancements, y compris en cours.
            <strong> Terminées</strong>, <strong>Abandons</strong> et <strong>Interruptions</strong> ont le même sens
            que pour les niveaux. <strong>Temps de jeu</strong> ne compte que le jeu lui-même, pas les écrans de
            choix : il est donc un peu plus petit que son temps dans le tableau ci-dessus.
          </li>
          <li>
            <strong>Jours joués (7 jours)</strong> : le nombre de jours différents, cette semaine, où l'enfant a
            lancé au moins une partie de ce jeu — un repère de régularité plutôt que de performance.
          </li>
          <li>
            <strong>Dernière partie</strong> : la date de la partie la plus récente sur ce jeu.
          </li>
        </ul>
      </section>
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

function Stars(props: { count: 0 | 1 | 2 | 3 }) {
  const { count } = props;
  return (
    <div className="pa-stars" role="img" aria-label={`${count} étoile${count > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name={i <= count ? 'star' : 'star-empty'} size={26} class="pa-star" />
      ))}
    </div>
  );
}
