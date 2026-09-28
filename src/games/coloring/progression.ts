// Progression du code magique, proposition de dessins, reprise et frigo (docs/specs/COLORIAGE.md §3.4, §3.5, §3.6, §2.5).
import type { Detail, Drawing } from './model';
import type { ColoringRecord, ColoringTier } from '../../storage/colorings';
import { createRng } from '../../engine/rng';
import { stateFromRecord } from './rules';

const UP_WINDOW = 3;
const UP_THRESHOLD = 0.8;
const DOWN_WINDOW = 2;
const DOWN_THRESHOLD = 0.5;

/** Une chaîne terminée : dessin, palier joué, date de fin, réussite du premier coup sur ses cases. */
interface CompletedChain {
  drawingId: string;
  tier: ColoringTier;
  completedAt: number;
  firstCoupRate: number;
}

/** Regroupe les parties en chaînes (reliées par `resumedFrom`) : ne garde que les chaînes terminées. */
function completedChains(records: readonly ColoringRecord[]): CompletedChain[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const referenced = new Set(records.map((r) => r.resumedFrom).filter((id): id is string => Boolean(id)));
  const tails = records.filter((r) => !referenced.has(r.id) && r.status === 'completed');

  const chains: CompletedChain[] = [];
  for (const tail of tails) {
    const chainRecords: ColoringRecord[] = [];
    let current: ColoringRecord | undefined = tail;
    while (current) {
      chainRecords.unshift(current);
      current = current.resumedFrom ? byId.get(current.resumedFrom) : undefined;
    }
    const first = chainRecords[0] as ColoringRecord;
    const firstAttemptPaint = new Map<string, string>();
    for (const record of chainRecords) {
      for (const attempt of record.attempts) {
        if (!firstAttemptPaint.has(attempt.zoneId)) firstAttemptPaint.set(attempt.zoneId, attempt.paint);
      }
    }
    const observedZones = tail.zones.filter((z) => !first.paintedAtStart.includes(z.id));
    const firstCoupCount = observedZones.filter((z) => firstAttemptPaint.get(z.id) === z.target).length;
    const firstCoupRate = observedZones.length > 0 ? firstCoupCount / observedZones.length : 1;
    chains.push({
      drawingId: tail.drawingId,
      tier: tail.tier,
      completedAt: tail.endedAt ?? tail.startedAt,
      firstCoupRate,
    });
  }
  return chains.sort((a, b) => a.completedAt - b.completedAt);
}

/**
 * Palier automatique (docs/specs/COLORIAGE.md §3.4) : part du palier 1, parcourt les dessins
 * terminés dans l'ordre de fin. Seuls comptent ceux joués au palier courant depuis qu'on y est
 * arrivé. Montée après 3 dessins si la réussite moyenne atteint 80 %, descente après 2 dessins si
 * elle reste sous 50 % (jamais sous le palier 1).
 */
export function autoTier(records: readonly ColoringRecord[]): ColoringTier {
  const chains = completedChains(records);
  let tier: ColoringTier = 1;
  let window: number[] = [];
  for (const chain of chains) {
    if (chain.tier !== tier) continue; // dessins joués à un autre palier : ignorés
    window.push(chain.firstCoupRate);

    if (window.length >= UP_WINDOW && tier < 4) {
      const lastUp = window.slice(-UP_WINDOW);
      const avgUp = lastUp.reduce((a, b) => a + b, 0) / UP_WINDOW;
      if (avgUp >= UP_THRESHOLD) {
        tier = (tier + 1) as ColoringTier;
        window = [];
        continue;
      }
    }
    if (window.length >= DOWN_WINDOW && tier > 1) {
      const lastDown = window.slice(-DOWN_WINDOW);
      const avgDown = lastDown.reduce((a, b) => a + b, 0) / DOWN_WINDOW;
      if (avgDown < DOWN_THRESHOLD) {
        tier = (tier - 1) as ColoringTier;
        window = [];
      }
    }
  }
  return tier;
}

/** Palier courant : le réglage parent (`Profile.gameSettings.coloring.tier`) s'il est posé, sinon l'automatique. */
export function currentTier(records: readonly ColoringRecord[], settingsTier?: ColoringTier): ColoringTier {
  return settingsTier ?? autoTier(records);
}

/**
 * Propose 3 dessins distincts (docs/specs/COLORIAGE.md §3.5) : le favori (terminé le plus souvent,
 * au moins 2 fois), puis les moins récemment terminés (jamais terminés d'abord, départagés par
 * mélange avec graine). Le dernier dessin terminé n'est jamais proposé.
 */
export function proposeDrawings(records: readonly ColoringRecord[], ids: readonly string[], seed: number): string[] {
  const chains = completedChains(records);
  const byDrawing = new Map<string, { count: number; lastAt: number }>();
  let lastCompletedId: string | null = null;
  let lastCompletedAt = -Infinity;
  for (const chain of chains) {
    const entry = byDrawing.get(chain.drawingId) ?? { count: 0, lastAt: -Infinity };
    entry.count += 1;
    entry.lastAt = Math.max(entry.lastAt, chain.completedAt);
    byDrawing.set(chain.drawingId, entry);
    if (chain.completedAt >= lastCompletedAt) {
      lastCompletedAt = chain.completedAt;
      lastCompletedId = chain.drawingId;
    }
  }

  const candidates = ids.filter((id) => id !== lastCompletedId);

  const favoriteCandidates = candidates.filter((id) => (byDrawing.get(id)?.count ?? 0) >= 2);
  let favorite: string | null = null;
  if (favoriteCandidates.length > 0) {
    const maxCount = Math.max(...favoriteCandidates.map((id) => byDrawing.get(id)?.count ?? 0));
    const top = favoriteCandidates.filter((id) => byDrawing.get(id)?.count === maxCount);
    favorite = createRng(seed).pick(top.slice().sort());
  }

  const rest = candidates.filter((id) => id !== favorite);
  const shuffled = createRng(seed + 1).shuffle(rest.slice().sort());
  const sorted = shuffled.slice().sort((a, b) => {
    const aInfo = byDrawing.get(a);
    const bInfo = byDrawing.get(b);
    if (!aInfo && bInfo) return -1;
    if (aInfo && !bInfo) return 1;
    if (!aInfo && !bInfo) return 0; // jamais joués : ordre du mélange
    return (aInfo as { lastAt: number }).lastAt - (bInfo as { lastAt: number }).lastAt;
  });

  const picks = (favorite ? [favorite] : []).concat(sorted);
  return picks.slice(0, 3);
}

/**
 * La dernière partie du profil est-elle reprenable (docs/specs/COLORIAGE.md §3.6) : c'est la plus
 * récente, elle est `abandoned` ou `in_progress`, il reste une case non peinte, et le dessin existe
 * encore au catalogue avec exactement les mêmes ids de cases au niveau `detail` enregistré.
 */
export function resumableRecord(
  records: readonly ColoringRecord[],
  findDrawing: (id: string) => Drawing | undefined,
): ColoringRecord | null {
  if (records.length === 0) return null;
  const last = records.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
  if (last.status !== 'abandoned' && last.status !== 'in_progress') return null;

  const { painted } = stateFromRecord(last);
  const hasUnpainted = last.zones.some((z) => !painted.has(z.id));
  if (!hasUnpainted) return null;

  const drawing = findDrawing(last.drawingId);
  if (!drawing) return null;
  const catalogIds = zoneIdsAtDetail(drawing, last.detail).slice().sort();
  const recordIds = last.zones.map((z) => z.id).slice().sort();
  if (catalogIds.length !== recordIds.length) return null;
  if (!catalogIds.every((id, i) => id === recordIds[i])) return null;

  return last;
}

function zoneIdsAtDetail(drawing: Drawing, detail: Detail): string[] {
  const layers = [...drawing.background, ...drawing.subjects.flatMap((s) => s.layers), ...(drawing.foreground ?? [])];
  return layers.filter((l) => l.kind === 'zone' && l.detail <= detail).map((l) => (l as { id: string }).id);
}

/** Les 12 derniers dessins terminés (docs/specs/COLORIAGE.md §2.5), les plus récents d'abord. */
export function fridgeItems(records: readonly ColoringRecord[]): ColoringRecord[] {
  return records
    .filter((r) => r.status === 'completed')
    .slice()
    .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
    .slice(0, 12);
}
