import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { MemoryParams } from '../../engine/types';
import { generateRounds } from './generate';
import { createTable, flip, gridFor, hideMismatch, isCleared, takeMissSignal } from './logic';
import { validateMemory } from './validate';

const params: MemoryParams = { pairs: 3, objects: ['apple', 'dog', 'car', 'fish'], maxMisses: 2, peekMs: 1000 };

describe('logic', () => {
  const cards = ['a', 'b', 'a', 'b'];

  it('première carte puis paire', () => {
    const t = createTable(cards, 3);
    expect(flip(t, 0)).toBe('first');
    expect(flip(t, 2)).toBe('match');
    expect(t.found).toEqual([true, false, true, false]);
    expect(t.flipped).toEqual([]);
  });

  it('paire différente : essai raté, taps ignorés jusqu au recachage', () => {
    const t = createTable(cards, 3);
    flip(t, 0);
    expect(flip(t, 1)).toBe('mismatch');
    expect(t.misses).toBe(1);
    expect(flip(t, 2)).toBe('ignored');
    hideMismatch(t);
    expect(flip(t, 2)).toBe('first');
  });

  it('ignore une carte trouvée ou déjà retournée', () => {
    const t = createTable(cards, 3);
    flip(t, 0);
    expect(flip(t, 0)).toBe('ignored');
    flip(t, 2);
    expect(flip(t, 0)).toBe('ignored');
    expect(flip(t, 9)).toBe('ignored');
  });

  it('signale le raté une seule fois, au dépassement de maxMisses', () => {
    const t = createTable(cards, 1);
    flip(t, 0);
    flip(t, 1);
    expect(takeMissSignal(t)).toBe(false); // 1 raté = permis
    hideMismatch(t);
    flip(t, 0);
    flip(t, 1);
    expect(takeMissSignal(t)).toBe(true);
    expect(takeMissSignal(t)).toBe(false);
    hideMismatch(t);
    flip(t, 0);
    flip(t, 3);
    expect(takeMissSignal(t)).toBe(false);
  });

  it('manche finie quand tout est trouvé', () => {
    const t = createTable(cards, 3);
    flip(t, 0);
    flip(t, 2);
    expect(isCleared(t)).toBe(false);
    flip(t, 1);
    flip(t, 3);
    expect(isCleared(t)).toBe(true);
  });

  it('grilles adaptées', () => {
    expect(gridFor(4)).toEqual({ cols: 2, rows: 2 });
    expect(gridFor(6)).toEqual({ cols: 2, rows: 3 });
    expect(gridFor(8)).toEqual({ cols: 2, rows: 4 });
    expect(gridFor(12)).toEqual({ cols: 3, rows: 4 });
    expect(gridFor(16)).toEqual({ cols: 4, rows: 4 });
  });
});

describe('generateRounds', () => {
  it('double des objets distincts', () => {
    const [r] = generateRounds(params, 1, createRng(1));
    expect(r!.data.cards).toHaveLength(6);
    const counts = new Map<string, number>();
    r!.data.cards.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    expect(counts.size).toBe(3);
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
    expect(r!.answer).toBe('cleared');
    expect(r!.data.peekMs).toBe(1000);
  });

  it('est déterministe', () => {
    expect(generateRounds(params, 3, createRng(7))).toEqual(generateRounds(params, 3, createRng(7)));
  });

  it('manches distinctes quand possible', () => {
    const rounds = generateRounds(params, 5, createRng(3));
    expect(new Set(rounds.map((r) => r.data.cards.join())).size).toBe(5);
  });
});

describe('validateMemory', () => {
  it('accepte des paramètres corrects', () => {
    expect(validateMemory(params)).toEqual([]);
  });
  it('refuse objet inconnu, réservoir trop petit, maxMisses nul, aperçu trop long', () => {
    expect(validateMemory({ ...params, objects: ['apple', 'nope', 'dog'] as never })).not.toEqual([]);
    expect(validateMemory({ ...params, objects: ['apple', 'dog'] })).not.toEqual([]);
    expect(validateMemory({ ...params, pairs: 4, objects: ['apple', 'apple', 'dog', 'car'] })).not.toEqual([]);
    expect(validateMemory({ ...params, maxMisses: 0 })).not.toEqual([]);
    expect(validateMemory({ ...params, peekMs: 3500 })).not.toEqual([]);
    expect(validateMemory({ ...params, pairs: 9 })).not.toEqual([]);
  });
});
