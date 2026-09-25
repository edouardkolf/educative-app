// Résolution de la dépose (drag & drop) du « trieur magique » — pure, sans DOM, testable.
// Hitbox très tolérante : un panier « attrape » l'objet dès que leurs rectangles se chevauchent une
// fois le panier gonflé de `HITBOX_INFLATE_PX`. En cas de chevauchement avec plusieurs paniers, celui
// dont l'aire de chevauchement est la plus grande gagne ; à égalité, le plus proche en centre à centre.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BasketRect {
  id: string;
  rect: Rect;
}

export const HITBOX_INFLATE_PX = 40;

function inflate(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, width: rect.width + 2 * by, height: rect.height + 2 * by };
}

function overlapArea(a: Rect, b: Rect): number {
  const overlapWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapWidth * overlapHeight;
}

function center(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Le panier qui « attrape » l'objet relâché à cette position, ou `null` si aucun ne le chevauche
 * (même une fois gonflé) : l'objet doit alors revenir au centre, sans manche jouée.
 */
export function resolveBasket(objectRect: Rect, baskets: readonly BasketRect[]): string | null {
  const objectCenter = center(objectRect);
  let best: { id: string; overlap: number; distance: number } | null = null;

  for (const basket of baskets) {
    const overlap = overlapArea(objectRect, inflate(basket.rect, HITBOX_INFLATE_PX));
    if (overlap <= 0) continue;
    const distance = distanceSquared(objectCenter, center(basket.rect));
    if (!best || overlap > best.overlap || (overlap === best.overlap && distance < best.distance)) {
      best = { id: basket.id, overlap, distance };
    }
  }

  return best?.id ?? null;
}
