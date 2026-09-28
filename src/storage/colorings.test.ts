import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import {
  abandonColoring,
  completeColoring,
  isColoringFinished,
  isColoringRecord,
  isColoringSettings,
  listColorings,
  recordPaint,
  startColoring,
} from './index';
import type { ColoringInit, ColoringRecord, PaintAttempt } from './colorings';

beforeEach(async () => {
  await resetStorageForTests();
});

function init(overrides: Partial<ColoringInit> = {}): ColoringInit {
  return {
    drawingId: 'house',
    tier: 1,
    detail: 1,
    variantSeed: 1,
    zones: [
      { id: 'z1', target: 'red' },
      { id: 'z2', target: 'orange' },
    ],
    legend: null,
    paintedAtStart: [],
    missesAtStart: {},
    ...overrides,
  };
}

function attempt(overrides: Partial<PaintAttempt> = {}): PaintAttempt {
  return { zoneId: 'z1', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 0, ...overrides };
}

describe('startColoring / recordPaint', () => {
  it('crée une partie in_progress avec attempts vide', async () => {
    const record = await startColoring('p1', init());
    expect(record.status).toBe('in_progress');
    expect(record.attempts).toEqual([]);
  });

  it('recordPaint ajoute un essai et met à jour activeMs', async () => {
    const record = await startColoring('p1', init());
    await recordPaint(record.id, attempt(), 250);

    const [stored] = await listColorings('p1');
    expect(stored?.attempts).toHaveLength(1);
    expect(stored?.activeMs).toBe(250);
  });

  it('n\'agit que sur une partie in_progress (F6)', async () => {
    const record = await startColoring('p1', init());
    await completeColoring(record.id, 100);
    await recordPaint(record.id, attempt(), 999);

    const [stored] = await listColorings('p1');
    expect(stored?.attempts).toEqual([]);
    expect(stored?.activeMs).toBe(100);
  });
});

describe('completeColoring / abandonColoring', () => {
  it('completeColoring passe à completed avec activeMs final', async () => {
    const record = await startColoring('p1', init());
    await completeColoring(record.id, 500);

    const [stored] = await listColorings('p1');
    expect(stored?.status).toBe('completed');
    expect(stored?.activeMs).toBe(500);
  });

  it('abandonColoring passe à abandoned avec la raison et activeMs final', async () => {
    const record = await startColoring('p1', init());
    await abandonColoring(record.id, 'time-up', 300);

    const [stored] = await listColorings('p1');
    expect(stored?.status).toBe('abandoned');
    expect(stored?.endReason).toBe('time-up');
    expect(stored?.activeMs).toBe(300);
  });
});

describe('isColoringFinished', () => {
  it('vrai quand toutes les zones sont peintes (par paintedAtStart ou par un essai réussi)', async () => {
    const record = await startColoring('p1', init({ paintedAtStart: ['z1'] }));
    await recordPaint(record.id, attempt({ zoneId: 'z1' }), 10);
    let [stored] = await listColorings('p1');
    if (!stored) throw new Error('manquant');
    expect(isColoringFinished(stored)).toBe(false); // z2 pas peinte

    await recordPaint(record.id, attempt({ zoneId: 'z2', paint: 'orange', drops: ['red', 'yellow'] }), 20);
    [stored] = await listColorings('p1');
    if (!stored) throw new Error('manquant');
    expect(isColoringFinished(stored)).toBe(true);
  });

  it('un essai raté (paint ≠ target) ne compte pas la case comme peinte', () => {
    const record: ColoringRecord = {
      id: 'c1', profileId: 'p1', startedAt: 1, endedAt: null, status: 'in_progress', endReason: null, activeMs: 0,
      drawingId: 'house', tier: 1, detail: 1, variantSeed: 1,
      zones: [{ id: 'z1', target: 'red' }], legend: null, paintedAtStart: [], missesAtStart: {},
      attempts: [attempt({ zoneId: 'z1', paint: 'blue', drops: ['blue'] })],
    };
    expect(isColoringFinished(record)).toBe(false);
  });
});

describe('isColoringSettings', () => {
  it('accepte tier absent ou de 1 à 4, refuse le reste', () => {
    expect(isColoringSettings({})).toBe(true);
    expect(isColoringSettings({ tier: 1 })).toBe(true);
    expect(isColoringSettings({ tier: 4 })).toBe(true);
    expect(isColoringSettings({ tier: 5 })).toBe(false);
    expect(isColoringSettings({ tier: 0 })).toBe(false);
    expect(isColoringSettings(null)).toBe(false);
    expect(isColoringSettings('x')).toBe(false);
  });
});

describe('isColoringRecord (validation import)', () => {
  function valid(): ColoringRecord {
    return {
      id: 'c1',
      profileId: 'p1',
      startedAt: 1,
      endedAt: 2,
      status: 'completed',
      endReason: null,
      activeMs: 100,
      drawingId: 'house',
      tier: 1,
      detail: 1,
      variantSeed: 1,
      zones: [
        { id: 'z1', target: 'red' },
        { id: 'z2', target: 'orange' },
      ],
      legend: null,
      attempts: [
        attempt({ zoneId: 'z1', paint: 'red', drops: ['red'] }),
        attempt({ zoneId: 'z2', paint: 'orange', drops: ['red', 'yellow'], fresh: false }),
      ],
      paintedAtStart: [],
      missesAtStart: { z1: 2 },
    };
  }

  it('accepte un enregistrement valide', () => {
    expect(isColoringRecord(valid())).toBe(true);
  });

  it('refuse drawingId vide, tier/detail hors bornes, variantSeed non entier', () => {
    expect(isColoringRecord({ ...valid(), drawingId: '' })).toBe(false);
    expect(isColoringRecord({ ...valid(), tier: 5 })).toBe(false);
    expect(isColoringRecord({ ...valid(), detail: 4 })).toBe(false);
    expect(isColoringRecord({ ...valid(), variantSeed: 1.5 })).toBe(false);
  });

  it('refuse zones vides, ids dupliqués ou target hors palette', () => {
    expect(isColoringRecord({ ...valid(), zones: [] })).toBe(false);
    expect(isColoringRecord({ ...valid(), zones: [{ id: 'z1', target: 'red' }, { id: 'z1', target: 'red' }] })).toBe(
      false,
    );
    expect(isColoringRecord({ ...valid(), zones: [{ id: 'z1', target: 'pink' }] })).toBe(false);
  });

  it('refuse paintedAtStart hors zones ou dupliqué, missesAtStart hors zones ou négatif', () => {
    expect(isColoringRecord({ ...valid(), paintedAtStart: ['zX'] })).toBe(false);
    expect(isColoringRecord({ ...valid(), paintedAtStart: ['z1', 'z1'] })).toBe(false);
    expect(isColoringRecord({ ...valid(), missesAtStart: { zX: 1 } })).toBe(false);
    expect(isColoringRecord({ ...valid(), missesAtStart: { z1: -1 } })).toBe(false);
  });

  it('refuse un essai dont `paint` ne correspond pas au mélange de `drops`', () => {
    const broken = { ...valid(), attempts: [attempt({ zoneId: 'z1', paint: 'blue', drops: ['red'] })] };
    expect(isColoringRecord(broken)).toBe(false);
  });

  it('refuse un essai avec zoneId inconnu, drops non primaires, help hors {0,1,2}', () => {
    expect(isColoringRecord({ ...valid(), attempts: [attempt({ zoneId: 'zX' })] })).toBe(false);
    expect(isColoringRecord({ ...valid(), attempts: [attempt({ drops: ['orange'], paint: 'orange' })] })).toBe(false);
    expect(isColoringRecord({ ...valid(), attempts: [attempt({ help: 3 as never })] })).toBe(false);
  });

  it('refuse une légende avec une clé hors palette ou une valeur vide', () => {
    expect(isColoringRecord({ ...valid(), legend: { pink: 'x' } })).toBe(false);
    expect(isColoringRecord({ ...valid(), legend: { red: '' } })).toBe(false);
    expect(isColoringRecord({ ...valid(), legend: { red: 'triangle' } })).toBe(true);
  });

  it('refuse une base commune invalide', () => {
    expect(isColoringRecord(null)).toBe(false);
    expect(isColoringRecord({ ...valid(), id: '' })).toBe(false);
  });
});
