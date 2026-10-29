import { describe, expect, it } from 'vitest';
import type { OrderParams } from '../../engine/types';
import { validateOrder } from './validate';

describe('order.validateOrder', () => {
  const ok: OrderParams = { items: 4, mode: 'size', objects: ['apple'], minGap: 15 };

  it('accepte des paramètres valides', () => {
    expect(validateOrder(ok)).toEqual([]);
    expect(validateOrder({ items: 3, mode: 'quantity', range: { min: 1, max: 5 } })).toEqual([]);
  });

  it('exige objects et minGap en mode size', () => {
    expect(validateOrder({ ...ok, objects: undefined }).length).toBe(1);
    expect(validateOrder({ ...ok, minGap: undefined }).length).toBe(1);
  });

  it('rejette un objet inconnu', () => {
    expect(validateOrder({ ...ok, objects: ['nope' as never] })[0]).toContain('nope');
  });

  it('rejette un écart infaisable', () => {
    expect(validateOrder({ ...ok, items: 5, minGap: 20 }).length).toBe(1);
    expect(validateOrder({ ...ok, items: 5, minGap: 15 })).toEqual([]);
  });

  it('contrôle range en mode quantity', () => {
    const q: OrderParams = { items: 4, mode: 'quantity' };
    expect(validateOrder(q).length).toBe(1);
    expect(validateOrder({ ...q, range: { min: 0, max: 5 } }).length).toBe(1);
    expect(validateOrder({ ...q, range: { min: 1, max: 10 } }).length).toBe(1);
    expect(validateOrder({ ...q, range: { min: 1, max: 3 } }).length).toBe(1);
  });
});
