// Résolution de la dépose (drag & drop, ou tap piece→slot) du « constructeur » — pure, sans DOM,
// testable. Deux questions distinctes, tranchées en une fois :
//  1. Position : quel emplacement LIBRE est le plus proche du centre de dépose, s'il y en a un dans
//     la tolérance (~15% de la largeur de la figure, réglé pour qu'une dépose « au hasard » ne
//     s'accroche pas) ?
//  2. Forme : la pièce déposée correspond-elle (même forme, même taille à tolérance près) à cet
//     emplacement ?
import type { BuilderShape } from './figures';

export interface Point {
  x: number;
  y: number;
}

export interface PieceShape {
  shape: BuilderShape;
  w: number;
  h: number;
}

export interface SlotTarget extends PieceShape {
  id: string;
  /** Centre de l'emplacement, mêmes unités que le centre de dépose (px écran, ou repère 100×100 en test). */
  center: Point;
  /** Déjà occupé par une autre pièce : ignoré par la résolution de position. */
  filled: boolean;
}

/** Tolérance de correspondance forme/taille (mêmes unités que `w`/`h` des emplacements/pièces). */
export const MATCH_TOLERANCE = 1;

export type PlacementResult =
  | { kind: 'match'; slotId: string }
  | { kind: 'mismatch'; slotId: string }
  | { kind: 'none' };

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** La pièce correspond-elle à l'emplacement (même forme, tailles égales à tolérance près) ? */
export function shapesMatch(piece: PieceShape, slot: PieceShape, tolerance = MATCH_TOLERANCE): boolean {
  return piece.shape === slot.shape && Math.abs(piece.w - slot.w) <= tolerance && Math.abs(piece.h - slot.h) <= tolerance;
}

/**
 * Emplacement libre le plus proche du centre de dépose, dans la tolérance donnée, ou `null` si
 * aucun (l'emplacement doit alors revenir au plateau, sans manche jouée).
 */
export function nearestFreeSlot(dropCenter: Point, slots: readonly SlotTarget[], toleranceRadius: number): string | null {
  let best: { id: string; distance: number } | null = null;
  for (const slot of slots) {
    if (slot.filled) continue;
    const d = distance(dropCenter, slot.center);
    if (d > toleranceRadius) continue;
    if (!best || d < best.distance) best = { id: slot.id, distance: d };
  }
  return best?.id ?? null;
}

/**
 * Résolution complète d'une dépose : cherche l'emplacement libre le plus proche dans la tolérance,
 * puis compare forme/taille.
 * - Rien dans la tolérance → `{ kind: 'none' }` : la pièce glisse au plateau, pas de manche ratée.
 * - Emplacement trouvé mais forme/taille différente → `{ kind: 'mismatch' }` : rebond, manche ratée.
 * - Emplacement trouvé et correspondant → `{ kind: 'match' }` : la pièce se pose.
 */
export function resolvePlacement(
  piece: PieceShape,
  dropCenter: Point,
  slots: readonly SlotTarget[],
  toleranceRadius: number,
): PlacementResult {
  const slotId = nearestFreeSlot(dropCenter, slots, toleranceRadius);
  if (!slotId) return { kind: 'none' };
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return { kind: 'none' }; // ne devrait pas arriver
  return shapesMatch(piece, slot) ? { kind: 'match', slotId } : { kind: 'mismatch', slotId };
}
