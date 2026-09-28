// Tests de summarizeColorings (docs/specs/COLORIAGE.md §5.4, tâche C6).
import { describe, expect, it } from 'vitest';
import type { ColoringRecord, PaintAttempt } from '../../storage/colorings';
import { summarizeColorings } from './stats';

let seq = 0;
function attempt(zoneId: string, paint: PaintAttempt['paint'], overrides: Partial<PaintAttempt> = {}): PaintAttempt {
  seq += 1;
  return { zoneId, paint, drops: [paint], fresh: true, help: 0, at: seq * 100, ...overrides };
}

function record(overrides: Partial<ColoringRecord> = {}): ColoringRecord {
  return {
    id: overrides.id ?? `r-${Math.random()}`,
    profileId: 'p1',
    startedAt: 1000,
    endedAt: 2000,
    status: 'completed',
    endReason: null,
    activeMs: 5000,
    drawingId: 'house',
    tier: 1,
    detail: 1,
    variantSeed: 1,
    zones: [
      { id: 'roof', target: 'red' },
      { id: 'wall', target: 'yellow' },
      { id: 'door', target: 'blue' },
    ],
    legend: null,
    attempts: [],
    paintedAtStart: [],
    missesAtStart: {},
    ...overrides,
  };
}

describe('summarizeColorings', () => {
  it('compte les dessins commencés/terminés/inachevés par chaîne, pas par séance', () => {
    const finished = record({ id: 'a', attempts: [attempt('roof', 'red'), attempt('wall', 'yellow'), attempt('door', 'blue')] });
    const abandoned = record({ id: 'b', status: 'abandoned', endReason: 'quit', attempts: [attempt('roof', 'red')] });
    const summary = summarizeColorings([finished, abandoned]);
    expect(summary.drawingsStarted).toBe(2);
    expect(summary.drawingsCompleted).toBe(1);
    expect(summary.drawingsUnfinished).toBe(1);
  });

  it('ne compte qu\'un seul dessin pour une chaîne reprise (quittée puis finie)', () => {
    const first = record({ id: 'a', status: 'abandoned', endReason: 'quit', attempts: [attempt('roof', 'red')] });
    const second = record({
      id: 'b',
      resumedFrom: 'a',
      paintedAtStart: ['roof'],
      attempts: [attempt('wall', 'yellow'), attempt('door', 'blue')],
    });
    const summary = summarizeColorings([first, second]);
    expect(summary.drawingsStarted).toBe(1);
    expect(summary.drawingsCompleted).toBe(1);
    expect(summary.drawingsUnfinished).toBe(0);
  });

  it('réussite du premier coup : sur le 1er essai de la chaîne par case peinte', () => {
    const rec = record({
      attempts: [
        attempt('roof', 'blue'), // raté
        attempt('roof', 'red'), // corrige, peint
        attempt('wall', 'yellow'), // juste du premier coup
        // 'door' jamais peinte : ne compte pas
      ],
    });
    const summary = summarizeColorings([rec]);
    expect(summary.firstTryRate).toBe(0.5); // 1 juste (wall) sur 2 cases peintes (roof, wall)
  });

  it('recette par couleur : essais frais seulement, affichée à partir de 5 essais, avec la confusion', () => {
    const attempts: PaintAttempt[] = [];
    for (let i = 0; i < 3; i += 1) attempts.push(attempt('roof', 'red'));
    for (let i = 0; i < 3; i += 1) attempts.push(attempt('roof', 'purple')); // confusion répétée
    // Un essai non frais (même contenu du récipient réutilisé) ne compte pas dans la recette.
    attempts.push(attempt('roof', 'red', { fresh: false }));
    const rec = record({ zones: [{ id: 'roof', target: 'red' }], attempts });
    const summary = summarizeColorings([rec]);
    const redStat = summary.recipes.find((r) => r.color === 'red');
    expect(redStat).toBeDefined();
    expect(redStat?.attempts).toBe(6); // 6 essais frais (le 7e n'est pas fresh)
    expect(redStat?.confusion).toBe('purple');
  });

  it('sous 5 essais frais, la couleur n\'apparaît pas dans les recettes', () => {
    const attempts = [attempt('roof', 'red'), attempt('roof', 'red')];
    const rec = record({ zones: [{ id: 'roof', target: 'red' }], attempts });
    const summary = summarizeColorings([rec]);
    expect(summary.recipes.find((r) => r.color === 'red')).toBeUndefined();
  });

  it('aide de la main : cases peintes avec help=2 / cases peintes', () => {
    const rec = record({
      attempts: [attempt('roof', 'red', { help: 2 }), attempt('wall', 'yellow', { help: 0 })],
    });
    const summary = summarizeColorings([rec]);
    expect(summary.handHelpRate).toBe(0.5);
  });

  it('palier : dessins terminés et réussite du premier coup par palier joué', () => {
    const t1 = record({ id: 'a', tier: 1, attempts: [attempt('roof', 'red'), attempt('wall', 'yellow'), attempt('door', 'blue')] });
    const t2 = record({
      id: 'b',
      tier: 2,
      attempts: [attempt('roof', 'blue'), attempt('roof', 'red'), attempt('wall', 'yellow'), attempt('door', 'blue')],
    });
    const summary = summarizeColorings([t1, t2]);
    const byTier1 = summary.byTier.find((t) => t.tier === 1);
    const byTier2 = summary.byTier.find((t) => t.tier === 2);
    expect(byTier1?.completed).toBe(1);
    expect(byTier1?.firstTryRate).toBe(1);
    expect(byTier2?.completed).toBe(1);
    expect(byTier2?.firstTryRate).toBeCloseTo(2 / 3);
  });

  it('sans partie, tous les indicateurs sont vides ou nuls', () => {
    const summary = summarizeColorings([]);
    expect(summary.drawingsStarted).toBe(0);
    expect(summary.firstTryRate).toBeNull();
    expect(summary.medianTimePerDrawingMs).toBeNull();
    expect(summary.recipes).toEqual([]);
    expect(summary.byTier).toEqual([]);
    expect(summary.handHelpRate).toBeNull();
  });
});
