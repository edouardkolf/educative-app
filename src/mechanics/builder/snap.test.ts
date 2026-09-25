import { describe, expect, it } from 'vitest';
import { nearestFreeSlot, resolvePlacement, shapesMatch, type SlotTarget } from './snap';

const slot = (overrides: Partial<SlotTarget> = {}): SlotTarget => ({
  id: 's1',
  shape: 'square',
  w: 20,
  h: 20,
  center: { x: 0, y: 0 },
  filled: false,
  ...overrides,
});

describe('shapesMatch', () => {
  it('vrai si même forme et tailles égales', () => {
    expect(shapesMatch({ shape: 'circle', w: 18, h: 18 }, { shape: 'circle', w: 18, h: 18 })).toBe(true);
  });

  it('vrai dans la tolérance', () => {
    expect(shapesMatch({ shape: 'circle', w: 18.4, h: 17.7 }, { shape: 'circle', w: 18, h: 18 })).toBe(true);
  });

  it('faux si la forme diffère', () => {
    expect(shapesMatch({ shape: 'square', w: 18, h: 18 }, { shape: 'circle', w: 18, h: 18 })).toBe(false);
  });

  it('faux si la taille diffère au-delà de la tolérance', () => {
    expect(shapesMatch({ shape: 'square', w: 10, h: 10 }, { shape: 'square', w: 18, h: 18 })).toBe(false);
  });
});

describe('nearestFreeSlot', () => {
  it('renvoie null si rien dans la tolérance', () => {
    const result = nearestFreeSlot({ x: 0, y: 0 }, [slot({ center: { x: 1000, y: 1000 } })], 40);
    expect(result).toBeNull();
  });

  it('attrape un emplacement libre proche', () => {
    const result = nearestFreeSlot({ x: 0, y: 0 }, [slot({ center: { x: 10, y: 0 } })], 40);
    expect(result).toBe('s1');
  });

  it('ignore un emplacement occupé même proche', () => {
    const result = nearestFreeSlot(
      { x: 0, y: 0 },
      [slot({ id: 'occupied', center: { x: 5, y: 0 }, filled: true }), slot({ id: 'free', center: { x: 30, y: 0 } })],
      40,
    );
    expect(result).toBe('free');
  });

  it('le plus proche gagne parmi plusieurs emplacements libres à portée', () => {
    const result = nearestFreeSlot(
      { x: 0, y: 0 },
      [slot({ id: 'far', center: { x: 35, y: 0 } }), slot({ id: 'near', center: { x: 12, y: 0 } })],
      40,
    );
    expect(result).toBe('near');
  });
});

describe('resolvePlacement', () => {
  const matchingSlot = slot({ id: 'match', shape: 'triangle', w: 20, h: 15, center: { x: 10, y: 0 } });

  it('match : emplacement libre à portée + forme/taille identiques', () => {
    const result = resolvePlacement({ shape: 'triangle', w: 20, h: 15 }, { x: 0, y: 0 }, [matchingSlot], 40);
    expect(result).toEqual({ kind: 'match', slotId: 'match' });
  });

  it('mismatch : emplacement à portée mais forme/taille différentes', () => {
    const result = resolvePlacement({ shape: 'circle', w: 20, h: 20 }, { x: 0, y: 0 }, [matchingSlot], 40);
    expect(result).toEqual({ kind: 'mismatch', slotId: 'match' });
  });

  it('none : rien à portée', () => {
    const result = resolvePlacement({ shape: 'triangle', w: 20, h: 15 }, { x: 0, y: 0 }, [matchingSlot], 5);
    expect(result).toEqual({ kind: 'none' });
  });

  it('un emplacement occupé est ignoré (résolution de position)', () => {
    const occupied = slot({ id: 'occupied', shape: 'triangle', w: 20, h: 15, center: { x: 2, y: 0 }, filled: true });
    const result = resolvePlacement({ shape: 'triangle', w: 20, h: 15 }, { x: 0, y: 0 }, [occupied, matchingSlot], 40);
    expect(result).toEqual({ kind: 'match', slotId: 'match' });
  });
});
