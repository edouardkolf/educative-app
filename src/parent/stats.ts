// Résumé global (tous niveaux confondus) affiché en tête des statistiques d'un enfant.
// Calcul direct à partir des parties : pas besoin de moteur, donc testable ici sans dépendance.
import { aboveChance } from '../engine';
import type { GameRecordBase, Run, UsageDay } from '../storage';

export interface RunsSummary {
  /** Parties lancées, tous niveaux confondus. */
  totalRuns: number;
  /** Manches réussies du premier coup / manches jouées ; null si aucune manche. */
  firstTryRate: number | null;
  /** Temps de jeu cumulé (somme des durées de manches), en ms. */
  playTimeMs: number;
}

export function summarizeRuns(runs: Run[]): RunsSummary {
  let roundsPlayed = 0;
  let firstTry = 0;
  let playTimeMs = 0;
  for (const run of runs) {
    for (const round of run.rounds) {
      roundsPlayed += 1;
      if (round.firstTry) firstTry += 1;
      playTimeMs += round.durationMs;
    }
  }
  return {
    totalRuns: runs.length,
    firstTryRate: roundsPlayed > 0 ? firstTry / roundsPlayed : null,
    playTimeMs,
  };
}

/**
 * Lecture d'un groupe (compétence ou type de jeu), à partir du taux corrigé du hasard :
 * - "strong" : point fort ; "ok" : en cours d'acquisition ; "weak" : à consolider ;
 * - "too-few" : trop peu de manches pour conclure ; "not-played" : jamais joué.
 */
export type SkillVerdict = 'strong' | 'ok' | 'weak' | 'too-few' | 'not-played';

/** En dessous, un taux ne veut rien dire (2 manches ratées sur 3 ≠ compétence faible). */
export const MIN_ROUNDS_FOR_VERDICT = 10;
/**
 * Seuils sur le score au-dessus du hasard (0 = hasard, 1 = sans faute).
 * Sur un jeu à 3 choix, ils correspondent à 80 % et 60 % de réussite brute.
 */
export const STRONG_SCORE = 0.7;
export const WEAK_SCORE = 0.4;
/** Sous ce score, la réussite ne se distingue pas du hasard. */
export const CHANCE_SCORE = 0.15;

export interface GroupLevel {
  levelId: string;
  /** Clé de regroupement : la compétence ou le type de jeu du niveau. */
  group: string;
  completed: boolean;
  /** Probabilité de réussir une manche du premier coup en tapant au hasard (voir chanceOfFirstTry). */
  chance: number;
}

export interface GroupSummary<G extends string = string> {
  group: G;
  /** Niveaux du parcours dans ce groupe, et ceux déjà réussis. */
  levels: number;
  levelsCompleted: number;
  roundsPlayed: number;
  /** Manches réussies du premier coup / manches jouées ; null si aucune manche. */
  firstTryRate: number | null;
  /** Réussite attendue au hasard sur les manches jouées ; null si aucune manche. */
  chanceRate: number | null;
  /** Score au-dessus du hasard : 0 = pas mieux que le hasard, 1 = toujours juste ; null si aucune manche. */
  score: number | null;
  /** Temps médian pour trouver la bonne réponse (la médiane ignore les manches où l'enfant a décroché). */
  medianRoundMs: number | null;
  verdict: SkillVerdict;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function verdictFor(roundsPlayed: number, score: number | null): SkillVerdict {
  if (roundsPlayed === 0 || score === null) return 'not-played';
  if (roundsPlayed < MIN_ROUNDS_FOR_VERDICT) return 'too-few';
  if (score >= STRONG_SCORE) return 'strong';
  if (score < WEAK_SCORE) return 'weak';
  return 'ok';
}

const VERDICT_ORDER: Record<SkillVerdict, number> = { strong: 0, ok: 0, weak: 0, 'too-few': 1, 'not-played': 2 };

/**
 * Statistiques regroupées (par compétence ou par type de jeu), pour les niveaux du parcours.
 * Tri : groupes lisibles du mieux au moins bien réussi (au-dessus du hasard), puis trop peu joués, puis jamais joués.
 */
export function summarizeByGroup<G extends string>(
  runs: Run[],
  levels: Array<GroupLevel & { group: G }>,
): GroupSummary<G>[] {
  const levelById = new Map(levels.map((l) => [l.levelId, l]));
  interface Acc {
    levels: number;
    completed: number;
    rounds: number;
    firstTry: number;
    chance: number;
    times: number[];
  }
  const acc = new Map<G, Acc>();
  for (const level of levels) {
    const entry = acc.get(level.group) ?? { levels: 0, completed: 0, rounds: 0, firstTry: 0, chance: 0, times: [] };
    entry.levels += 1;
    if (level.completed) entry.completed += 1;
    acc.set(level.group, entry);
  }
  for (const run of runs) {
    const level = levelById.get(run.levelId);
    if (!level) continue;
    const entry = acc.get(level.group) as Acc;
    for (const round of run.rounds) {
      entry.rounds += 1;
      if (round.firstTry) entry.firstTry += 1;
      entry.chance += level.chance;
      entry.times.push(round.durationMs);
    }
  }
  const out: GroupSummary<G>[] = [...acc.entries()].map(([group, e]) => {
    const firstTryRate = e.rounds > 0 ? e.firstTry / e.rounds : null;
    const chanceRate = e.rounds > 0 ? e.chance / e.rounds : null;
    const score = firstTryRate !== null && chanceRate !== null ? aboveChance(firstTryRate, chanceRate) : null;
    return {
      group,
      levels: e.levels,
      levelsCompleted: e.completed,
      roundsPlayed: e.rounds,
      firstTryRate,
      chanceRate,
      score,
      medianRoundMs: median(e.times),
      verdict: verdictFor(e.rounds, score),
    };
  });
  return out.sort(
    (a, b) =>
      VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
      (b.score ?? -1) - (a.score ?? -1) ||
      b.roundsPlayed - a.roundsPlayed,
  );
}

// ---------- Temps par activité et statistiques d'un jeu (docs/specs/HUB.md §5.5) ----------

/** Jour local "YYYY-MM-DD" au format de `dayKey` (storage/index.ts), recalculé ici pour rester pur et sans IndexedDB. */
function localDayKey(ms: number): string {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `day` décalé de `deltaDays` (peut être négatif), même format "YYYY-MM-DD". */
function shiftDayKey(day: string, deltaDays: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return localDayKey(date.getTime());
}

/** Secondes actives par activité (ActivityId de src/app/session.ts), pour une période. */
export type ActivityTotals = Record<string, number>;

export interface ActivityTimeSummary {
  /** Secondes actives par activité, aujourd'hui (`dayKey()`). */
  today: ActivityTotals;
  /** Secondes actives par activité, sur les 7 derniers jours (aujourd'hui et les 6 précédents). */
  week: ActivityTotals;
}

/**
 * Temps par activité (docs/specs/HUB.md §5.5) : les secondes non ventilées de chaque jour
 * (`activeSeconds` − somme de `activitySeconds`, jamais négatif) sont ajoutées à `map` (la Carte),
 * puisqu'avant la v2 seuls la carte et les parties de niveaux étaient comptés.
 */
export function summarizeActivityTime(days: readonly UsageDay[], today: string): ActivityTimeSummary {
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i)));
  const byDay = new Map(days.map((d) => [d.day, d]));

  function accumulate(dayKeys: Iterable<string>): ActivityTotals {
    const totals: ActivityTotals = {};
    for (const key of dayKeys) {
      const usage = byDay.get(key);
      if (!usage) continue;
      const activitySeconds = usage.activitySeconds ?? {};
      let ventilated = 0;
      for (const [activity, seconds] of Object.entries(activitySeconds)) {
        totals[activity] = (totals[activity] ?? 0) + seconds;
        ventilated += seconds;
      }
      const remainder = Math.max(0, usage.activeSeconds - ventilated);
      totals.map = (totals.map ?? 0) + remainder;
    }
    return totals;
  }

  return { today: accumulate([today]), week: accumulate(weekKeys) };
}

/** Total toutes activités confondues (= somme des `activeSeconds` de la période, cf. §5.5). */
export function totalActivitySeconds(totals: ActivityTotals): number {
  return Object.values(totals).reduce((sum, seconds) => sum + seconds, 0);
}

export interface GameRecordsSummary {
  /** Enregistrements du jeu, tous statuts, y compris en cours. */
  total: number;
  /** `status = 'completed'`. */
  completed: number;
  /** `endReason` vaut `quit` ou `closed`. */
  abandoned: number;
  /** `endReason = 'time-up'` ; ce ne sont pas des abandons. */
  interrupted: number;
  /** Somme des `activeMs`. */
  activeMs: number;
  /** Jours locaux distincts, parmi aujourd'hui et les 6 précédents, où au moins une partie a commencé. */
  daysPlayedInWeek: number;
  /** `startedAt` le plus récent ; null si aucune partie. */
  lastPlayedAt: number | null;
}

/** Indicateurs communs d'un jeu (docs/specs/HUB.md §5.5), à partir de ses enregistrements et de l'instant courant. */
export function summarizeGameRecords(records: readonly GameRecordBase[], now: number): GameRecordsSummary {
  const today = localDayKey(now);
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i)));
  let completed = 0;
  let abandoned = 0;
  let interrupted = 0;
  let activeMs = 0;
  let lastPlayedAt: number | null = null;
  const daysPlayed = new Set<string>();
  for (const record of records) {
    if (record.status === 'completed') completed += 1;
    if (record.endReason === 'quit' || record.endReason === 'closed') abandoned += 1;
    if (record.endReason === 'time-up') interrupted += 1;
    activeMs += record.activeMs;
    if (lastPlayedAt === null || record.startedAt > lastPlayedAt) lastPlayedAt = record.startedAt;
    const day = localDayKey(record.startedAt);
    if (weekKeys.has(day)) daysPlayed.add(day);
  }
  return {
    total: records.length,
    completed,
    abandoned,
    interrupted,
    activeMs,
    daysPlayedInWeek: daysPlayed.size,
    lastPlayedAt,
  };
}
