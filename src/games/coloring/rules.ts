// Peindre une case, aides graduées, complétion, reprise (docs/specs/COLORIAGE.md §3.2, §3.3, §2.6, §3.6).
import type { Color } from '../../engine/types';
import type { ColoringRecord, ColoringTier } from '../../storage/colorings';

/** Issue d'un tap résolu (`resolveTap`, `geometry.ts`) combiné à la peinture du récipient. */
export type PaintOutcome = 'painted' | 'missed' | 'empty-cup' | 'already-painted' | 'none';

/**
 * Applique une tentative de peinture (docs/specs/COLORIAGE.md §3.2) :
 * - `zoneId` null (rien sous le tap, ou hors dessin) : 'none' ;
 * - case déjà peinte : 'already-painted' (défense ; `resolveTap` l'exclut déjà normalement) ;
 * - récipient vide : 'empty-cup', ce n'est pas un essai ;
 * - peinture = cible : 'painted' ; sinon 'missed'.
 */
export function applyPaint(params: {
  zoneId: string | null;
  target: Color | undefined;
  painted: ReadonlySet<string>;
  cupPaint: Color | null;
}): PaintOutcome {
  const { zoneId, target, painted, cupPaint } = params;
  if (zoneId === null) return 'none';
  if (painted.has(zoneId)) return 'already-painted';
  if (cupPaint === null) return 'empty-cup';
  return target === cupPaint ? 'painted' : 'missed';
}

/**
 * Aide graduée (docs/specs/COLORIAGE.md §2.6), selon le palier et le nombre d'essais ratés sur la
 * case (séances précédentes comprises) : 0 aucune, 1 indice, 2 main.
 */
export function helpFor(tier: ColoringTier, misses: number): 0 | 1 | 2 {
  if (tier === 1) {
    return misses >= 2 ? 2 : 0;
  }
  if (misses >= 3) return 2;
  if (misses >= 2) return 1;
  return 0;
}

/** Le dessin est-il fini : toutes les cases sont peintes ? */
export function isComplete(zoneIds: readonly string[], painted: ReadonlySet<string>): boolean {
  return zoneIds.every((id) => painted.has(id));
}

/** État courant d'une partie : cases peintes et erreurs par case, `paintedAtStart`/`missesAtStart` compris. */
export interface ColoringState {
  painted: Set<string>;
  misses: Record<string, number>;
}

/**
 * Reconstruit l'état courant depuis un enregistrement (docs/specs/COLORIAGE.md §3.6) : reprend
 * `paintedAtStart` et `missesAtStart`, puis rejoue les essais de la partie en cours.
 */
export function stateFromRecord(record: ColoringRecord): ColoringState {
  const painted = new Set(record.paintedAtStart);
  const misses: Record<string, number> = { ...record.missesAtStart };
  const targetOf = new Map(record.zones.map((z) => [z.id, z.target]));
  for (const attempt of record.attempts) {
    const target = targetOf.get(attempt.zoneId);
    if (target === undefined) continue;
    if (attempt.paint === target) {
      painted.add(attempt.zoneId);
    } else {
      misses[attempt.zoneId] = (misses[attempt.zoneId] ?? 0) + 1;
    }
  }
  return { painted, misses };
}
