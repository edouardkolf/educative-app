// Résumé global (tous niveaux confondus) affiché en tête des statistiques d'un enfant.
// Calcul direct à partir des parties : pas besoin de moteur, donc testable ici sans dépendance.
import { aboveChance } from '../engine';
import type { Run } from '../storage';

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
