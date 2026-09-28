// Statistiques du coloriage magique (docs/specs/COLORIAGE.md §5.4). Logique pure : compte des
// dessins (chaînes reliées par `resumedFrom`), pas des séances (déjà comptées par ChildStats, cadre A8).
import type { Color } from '../../engine/types';
import { COLORS } from '../../engine/types';
import type { ColoringRecord, ColoringTier } from '../../storage/colorings';

const MIN_ATTEMPTS_FOR_RECIPE = 5;

/** Une chaîne : la suite des parties d'un même dessin, reliées par `resumedFrom` (docs/specs/COLORIAGE.md §3.6). */
interface Chain {
  records: ColoringRecord[]; // dans l'ordre (première partie d'abord)
  last: ColoringRecord;
}

function buildChains(records: readonly ColoringRecord[]): Chain[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const referenced = new Set(records.map((r) => r.resumedFrom).filter((id): id is string => Boolean(id)));
  const tails = records.filter((r) => !referenced.has(r.id));
  return tails.map((tail) => {
    const chain: ColoringRecord[] = [];
    let current: ColoringRecord | undefined = tail;
    while (current) {
      chain.unshift(current);
      current = current.resumedFrom ? byId.get(current.resumedFrom) : undefined;
    }
    return { records: chain, last: tail };
  });
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2 : (sorted[mid] as number);
}

export interface RecipeStat {
  color: Color;
  attempts: number;
  successRate: number;
  /** Couleur posée à tort la plus fréquente (≥ 2 fois), s'il y en a une. */
  confusion: Color | null;
}

export interface TierStat {
  tier: ColoringTier;
  completed: number;
  firstTryRate: number | null;
}

export interface ColoringStatsSummary {
  drawingsStarted: number;
  drawingsCompleted: number;
  drawingsUnfinished: number;
  /** Médiane de Σ activeMs des parties de la chaîne, sur les dessins terminés. */
  medianTimePerDrawingMs: number | null;
  /** Cases peintes dont le 1er essai de la chaîne était la bonne couleur, / cases peintes. */
  firstTryRate: number | null;
  recipes: RecipeStat[];
  byTier: TierStat[];
  /** Cases dont l'essai réussi a `help = 2`, / cases peintes. */
  handHelpRate: number | null;
}

export function summarizeColorings(records: readonly ColoringRecord[]): ColoringStatsSummary {
  const chains = buildChains(records);

  const drawingsStarted = chains.length;
  const drawingsCompleted = chains.filter((c) => c.last.status === 'completed').length;
  const drawingsUnfinished = chains.filter((c) => c.last.status === 'abandoned').length;

  const completedDurations = chains
    .filter((c) => c.last.status === 'completed')
    .map((c) => c.records.reduce((sum, r) => sum + r.activeMs, 0));
  const medianTimePerDrawingMs = median(completedDurations);

  // Cases peintes (toutes chaînes) : premier essai de la chaîne par case, et l'essai qui l'a peinte.
  let firstTryHits = 0;
  let paintedZones = 0;
  let handHelpHits = 0;
  const recipeAttempts = new Map<Color, { total: number; ok: number; wrong: Map<Color, number> }>();
  for (const color of COLORS) recipeAttempts.set(color, { total: 0, ok: 0, wrong: new Map() });

  const byTierAttempts = new Map<ColoringTier, { completed: number; hits: number; total: number }>();

  for (const chain of chains) {
    const firstAttemptByZone = new Map<string, Color>();
    for (const record of chain.records) {
      const targetOf = new Map(record.zones.map((z) => [z.id, z.target]));
      for (const attempt of record.attempts) {
        if (!firstAttemptByZone.has(attempt.zoneId)) firstAttemptByZone.set(attempt.zoneId, attempt.paint);
        const target = targetOf.get(attempt.zoneId);
        if (attempt.fresh && target !== undefined) {
          const stat = recipeAttempts.get(target) as { total: number; ok: number; wrong: Map<Color, number> };
          stat.total += 1;
          if (attempt.paint === target) stat.ok += 1;
          else stat.wrong.set(attempt.paint, (stat.wrong.get(attempt.paint) ?? 0) + 1);
        }
      }
    }
    const zoneIds = chain.last.zones.map((z) => z.id);
    for (const zoneId of zoneIds) {
      const first = firstAttemptByZone.get(zoneId);
      const target = chain.last.zones.find((z) => z.id === zoneId)?.target;
      if (first === undefined || target === undefined) continue; // jamais peinte : ne compte pas
      paintedZones += 1;
      if (first === target) firstTryHits += 1;
    }

    // Aide de la main : parcourt tous les essais de la chaîne pour retrouver l'essai réussi de chaque case.
    const wonWithHand = new Set<string>();
    const won = new Set<string>();
    for (const record of chain.records) {
      const targetOf = new Map(record.zones.map((z) => [z.id, z.target]));
      for (const attempt of record.attempts) {
        const target = targetOf.get(attempt.zoneId);
        if (target !== undefined && attempt.paint === target && !won.has(attempt.zoneId)) {
          won.add(attempt.zoneId);
          if (attempt.help === 2) wonWithHand.add(attempt.zoneId);
        }
      }
    }
    handHelpHits += wonWithHand.size;

    const tier = chain.last.tier;
    const entry = byTierAttempts.get(tier) ?? { completed: 0, hits: 0, total: 0 };
    if (chain.last.status === 'completed') entry.completed += 1;
    for (const zoneId of zoneIds) {
      const first = firstAttemptByZone.get(zoneId);
      const target = chain.last.zones.find((z) => z.id === zoneId)?.target;
      if (first === undefined || target === undefined) continue;
      entry.total += 1;
      if (first === target) entry.hits += 1;
    }
    byTierAttempts.set(tier, entry);
  }

  const recipes: RecipeStat[] = COLORS.filter((c) => (recipeAttempts.get(c)?.total ?? 0) >= MIN_ATTEMPTS_FOR_RECIPE).map(
    (color) => {
      const stat = recipeAttempts.get(color) as { total: number; ok: number; wrong: Map<Color, number> };
      let confusion: Color | null = null;
      let confusionCount = 0;
      for (const [c, count] of stat.wrong) {
        if (count >= 2 && count > confusionCount) {
          confusion = c;
          confusionCount = count;
        }
      }
      return { color, attempts: stat.total, successRate: stat.ok / stat.total, confusion };
    },
  );

  const byTier: TierStat[] = [1, 2, 3, 4]
    .filter((t) => byTierAttempts.has(t as ColoringTier))
    .map((t) => {
      const entry = byTierAttempts.get(t as ColoringTier) as { completed: number; hits: number; total: number };
      return { tier: t as ColoringTier, completed: entry.completed, firstTryRate: entry.total > 0 ? entry.hits / entry.total : null };
    });

  return {
    drawingsStarted,
    drawingsCompleted,
    drawingsUnfinished,
    medianTimePerDrawingMs,
    firstTryRate: paintedZones > 0 ? firstTryHits / paintedZones : null,
    recipes,
    byTier,
    handHelpRate: paintedZones > 0 ? handHelpHits / paintedZones : null,
  };
}
