import { describe, expect, it } from 'vitest';
import { applyPaint, helpFor, isComplete, stateFromRecord } from './rules';
import type { ColoringRecord } from '../../storage/colorings';

describe('applyPaint', () => {
  it('case peinte : cible atteinte', () => {
    expect(applyPaint({ zoneId: 'a', target: 'red', painted: new Set(), cupPaint: 'red' })).toBe('painted');
  });

  it('case ratée : mauvaise couleur', () => {
    expect(applyPaint({ zoneId: 'a', target: 'red', painted: new Set(), cupPaint: 'blue' })).toBe('missed');
  });

  it('sans peinture : récipient vide', () => {
    expect(applyPaint({ zoneId: 'a', target: 'red', painted: new Set(), cupPaint: null })).toBe('empty-cup');
  });

  it('déjà peinte', () => {
    expect(applyPaint({ zoneId: 'a', target: 'red', painted: new Set(['a']), cupPaint: 'red' })).toBe(
      'already-painted',
    );
  });

  it('rien sous le tap', () => {
    expect(applyPaint({ zoneId: null, target: undefined, painted: new Set(), cupPaint: 'red' })).toBe('none');
  });
});

describe('helpFor', () => {
  it('palier 1 : la main après 2 erreurs, rien avant', () => {
    expect(helpFor(1, 0)).toBe(0);
    expect(helpFor(1, 1)).toBe(0);
    expect(helpFor(1, 2)).toBe(2);
    expect(helpFor(1, 5)).toBe(2);
  });

  it('paliers 2 à 4 : indice après 2, main après 3', () => {
    for (const tier of [2, 3, 4] as const) {
      expect(helpFor(tier, 0)).toBe(0);
      expect(helpFor(tier, 1)).toBe(0);
      expect(helpFor(tier, 2)).toBe(1);
      expect(helpFor(tier, 3)).toBe(2);
      expect(helpFor(tier, 10)).toBe(2);
    }
  });
});

describe('isComplete', () => {
  it('vrai seulement quand toutes les cases sont peintes', () => {
    expect(isComplete(['a', 'b'], new Set(['a']))).toBe(false);
    expect(isComplete(['a', 'b'], new Set(['a', 'b']))).toBe(true);
    expect(isComplete([], new Set())).toBe(true);
  });
});

function makeRecord(overrides: Partial<ColoringRecord>): ColoringRecord {
  return {
    id: 'r1',
    profileId: 'p1',
    startedAt: 0,
    endedAt: null,
    status: 'in_progress',
    endReason: null,
    activeMs: 0,
    drawingId: 'house',
    tier: 1,
    detail: 1,
    variantSeed: 0,
    zones: [
      { id: 'a', target: 'red' },
      { id: 'b', target: 'blue' },
    ],
    legend: null,
    attempts: [],
    paintedAtStart: [],
    missesAtStart: {},
    ...overrides,
  };
}

describe('stateFromRecord', () => {
  it('reprend paintedAtStart et missesAtStart', () => {
    const record = makeRecord({ paintedAtStart: ['a'], missesAtStart: { b: 2 } });
    const state = stateFromRecord(record);
    expect(state.painted.has('a')).toBe(true);
    expect(state.misses.b).toBe(2);
  });

  it('rejoue les essais de la partie en cours (peints et ratés)', () => {
    const record = makeRecord({
      attempts: [
        { zoneId: 'a', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 0 }, // raté
        { zoneId: 'a', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 100 }, // réussi
        { zoneId: 'b', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 200 }, // réussi
      ],
    });
    const state = stateFromRecord(record);
    expect(state.painted.has('a')).toBe(true);
    expect(state.painted.has('b')).toBe(true);
    expect(state.misses.a).toBe(1);
    expect(state.misses.b ?? 0).toBe(0);
  });

  it('cumule les erreurs par-dessus missesAtStart', () => {
    const record = makeRecord({
      missesAtStart: { a: 1 },
      attempts: [{ zoneId: 'a', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 0 }],
    });
    const state = stateFromRecord(record);
    expect(state.misses.a).toBe(2);
  });
});
