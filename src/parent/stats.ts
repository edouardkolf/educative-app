// Résumé global (tous niveaux confondus) affiché en tête des statistiques d'un enfant.
// Calcul direct à partir des parties : pas besoin de moteur, donc testable ici sans dépendance.
import type { SkillId } from '../engine';
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
 * Lecture d'une compétence :
 * - "strong" : point fort ; "ok" : en cours d'acquisition ; "weak" : à consolider ;
 * - "too-few" : trop peu de manches pour conclure ; "not-played" : jamais jouée.
 */
export type SkillVerdict = 'strong' | 'ok' | 'weak' | 'too-few' | 'not-played';

/** En dessous, un taux ne veut rien dire (2 manches ratées sur 3 ≠ compétence faible). */
export const MIN_ROUNDS_FOR_VERDICT = 10;
export const STRONG_RATE = 0.8;
export const WEAK_RATE = 0.6;

export interface SkillLevel {
  levelId: string;
  skill: SkillId;
  completed: boolean;
}

export interface SkillSummary {
  skill: SkillId;
  /** Niveaux du parcours qui travaillent cette compétence, et ceux déjà réussis. */
  levels: number;
  levelsCompleted: number;
  roundsPlayed: number;
  /** Manches réussies du premier coup / manches jouées ; null si aucune manche. */
  firstTryRate: number | null;
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

function verdictFor(roundsPlayed: number, rate: number | null): SkillVerdict {
  if (roundsPlayed === 0 || rate === null) return 'not-played';
  if (roundsPlayed < MIN_ROUNDS_FOR_VERDICT) return 'too-few';
  if (rate >= STRONG_RATE) return 'strong';
  if (rate < WEAK_RATE) return 'weak';
  return 'ok';
}

const VERDICT_ORDER: Record<SkillVerdict, number> = { strong: 0, ok: 0, weak: 0, 'too-few': 1, 'not-played': 2 };

/**
 * Statistiques regroupées par compétence, pour les niveaux du parcours.
 * Tri : compétences lisibles de la mieux à la moins bien réussie, puis trop peu jouées, puis jamais jouées.
 */
export function summarizeBySkill(runs: Run[], levels: SkillLevel[]): SkillSummary[] {
  const skillOf = new Map(levels.map((l) => [l.levelId, l.skill]));
  const acc = new Map<
    SkillId,
    { levels: number; completed: number; rounds: number; firstTry: number; times: number[] }
  >();
  for (const level of levels) {
    const entry = acc.get(level.skill) ?? { levels: 0, completed: 0, rounds: 0, firstTry: 0, times: [] };
    entry.levels += 1;
    if (level.completed) entry.completed += 1;
    acc.set(level.skill, entry);
  }
  for (const run of runs) {
    const skill = skillOf.get(run.levelId);
    if (!skill) continue;
    const entry = acc.get(skill);
    if (!entry) continue;
    for (const round of run.rounds) {
      entry.rounds += 1;
      if (round.firstTry) entry.firstTry += 1;
      entry.times.push(round.durationMs);
    }
  }
  const out: SkillSummary[] = [...acc.entries()].map(([skill, e]) => {
    const firstTryRate = e.rounds > 0 ? e.firstTry / e.rounds : null;
    return {
      skill,
      levels: e.levels,
      levelsCompleted: e.completed,
      roundsPlayed: e.rounds,
      firstTryRate,
      medianRoundMs: median(e.times),
      verdict: verdictFor(e.rounds, firstTryRate),
    };
  });
  return out.sort(
    (a, b) =>
      VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
      (b.firstTryRate ?? -1) - (a.firstTryRate ?? -1) ||
      b.roundsPlayed - a.roundsPlayed,
  );
}
