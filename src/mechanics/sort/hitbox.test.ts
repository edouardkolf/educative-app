import { describe, expect, it } from 'vitest';
import { HITBOX_INFLATE_PX, resolveBasket, type BasketRect, type Rect } from './hitbox';

const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

describe('resolveBasket', () => {
  it('renvoie null quand aucun panier ne chevauche, même gonflé', () => {
    const object = rect(0, 0, 50, 50);
    const baskets: BasketRect[] = [{ id: 'farm', rect: rect(500, 500, 100, 100) }];
    expect(resolveBasket(object, baskets)).toBeNull();
  });

  it("attrape un panier directement chevauché", () => {
    const object = rect(100, 100, 50, 50);
    const baskets: BasketRect[] = [
      { id: 'farm', rect: rect(90, 90, 80, 80) },
      { id: 'sea', rect: rect(400, 400, 80, 80) },
    ];
    expect(resolveBasket(object, baskets)).toBe('farm');
  });

  it('hitbox tolérante : attrape un panier proche mais pas encore chevauché sans gonflement', () => {
    // L'objet est à 20px du panier (aucun chevauchement direct), dans la marge de tolérance (40px).
    const object = rect(0, 0, 50, 50);
    const baskets: BasketRect[] = [{ id: 'farm', rect: rect(70, 0, 50, 50) }];
    expect(resolveBasket(object, baskets)).toBe('farm');
  });

  it('hors de portée même avec le gonflement : null', () => {
    const object = rect(0, 0, 50, 50);
    const gap = HITBOX_INFLATE_PX + 20; // au-delà de la tolérance
    const baskets: BasketRect[] = [{ id: 'farm', rect: rect(50 + gap, 0, 50, 50) }];
    expect(resolveBasket(object, baskets)).toBeNull();
  });

  it('choisit le panier avec la plus grande aire de chevauchement', () => {
    const object = rect(0, 0, 100, 100);
    const baskets: BasketRect[] = [
      { id: 'small-overlap', rect: rect(90, 90, 100, 100) }, // chevauche un petit coin
      { id: 'big-overlap', rect: rect(-10, -10, 100, 100) }, // chevauche presque tout
    ];
    expect(resolveBasket(object, baskets)).toBe('big-overlap');
  });

  it('égalité de chevauchement (les deux contiennent tout l\'objet) : le panier le plus proche gagne', () => {
    const object = rect(0, 0, 100, 100); // centre (50, 50)
    const baskets: BasketRect[] = [
      // Les deux contiennent entièrement l'objet : même aire de chevauchement (10000), quelle que
      // soit leur taille au-delà. Seul leur centre diffère.
      { id: 'near', rect: rect(-50, -50, 200, 200) }, // centre (50, 50), distance 0
      { id: 'far', rect: rect(-50, -50, 200, 300) }, // centre (50, 100), distance 50
    ];
    expect(resolveBasket(object, baskets)).toBe('near');
  });
});
