import { describe, expect, it } from 'vitest';
import { autoTier, currentTier, fridgeItems, proposeDrawings, resumableRecord } from './progression';
import type { ColoringRecord } from '../../storage/colorings';
import type { Drawing } from './model';

let nextId = 0;
function record(overrides: Partial<ColoringRecord>): ColoringRecord {
  nextId += 1;
  return {
    id: `r${nextId}`,
    profileId: 'p1',
    startedAt: nextId * 1000,
    endedAt: nextId * 1000 + 500,
    status: 'completed',
    endReason: null,
    activeMs: 500,
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

/** Une chaîne terminée au palier donné, avec un taux de premier coup donné (sur 2 cases). */
function completedChain(tier: ColoringRecord['tier'], firstCoupRate: 0 | 0.5 | 1): ColoringRecord {
  const attempts: ColoringRecord['attempts'] =
    firstCoupRate === 1
      ? [
          { zoneId: 'a', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 0 },
          { zoneId: 'b', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 1 },
        ]
      : firstCoupRate === 0.5
        ? [
            { zoneId: 'a', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 0 },
            { zoneId: 'b', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 1 }, // raté
            { zoneId: 'b', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 2 },
          ]
        : [
            { zoneId: 'a', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 0 }, // raté
            { zoneId: 'a', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 1 },
            { zoneId: 'b', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 2 }, // raté
            { zoneId: 'b', paint: 'blue', drops: ['blue'], fresh: true, help: 0, at: 3 },
          ];
  return record({ tier, attempts });
}

describe('autoTier', () => {
  it('reste au palier 1 sans historique', () => {
    expect(autoTier([])).toBe(1);
  });

  it('monte après 3 dessins réussis à 80 % ou plus', () => {
    const records = [completedChain(1, 1), completedChain(1, 1), completedChain(1, 1)];
    expect(autoTier(records)).toBe(2);
  });

  it('ne monte pas avant 3 dessins', () => {
    const records = [completedChain(1, 1), completedChain(1, 1)];
    expect(autoTier(records)).toBe(1);
  });

  it('ne monte pas si la réussite moyenne est sous 80 %', () => {
    const records = [completedChain(1, 1), completedChain(1, 0.5), completedChain(1, 0.5)];
    expect(autoTier(records)).toBe(1);
  });

  it('descend après 2 dessins sous 50 %', () => {
    // Monte au palier 2, puis 2 dessins ratés au palier 2 fait redescendre à 1.
    const records = [
      completedChain(1, 1),
      completedChain(1, 1),
      completedChain(1, 1),
      completedChain(2, 0),
      completedChain(2, 0),
    ];
    expect(autoTier(records)).toBe(1);
  });

  it('ne descend jamais sous le palier 1', () => {
    const records = [completedChain(1, 0), completedChain(1, 0)];
    expect(autoTier(records)).toBe(1);
  });

  it('remet le compte à zéro à chaque changement de palier', () => {
    // Monte à 3 réussites, puis seulement 1 dessin raté (pas assez pour redescendre après remise à zéro).
    const records = [completedChain(1, 1), completedChain(1, 1), completedChain(1, 1), completedChain(2, 0)];
    expect(autoTier(records)).toBe(2);
  });

  it('ignore les dessins joués à un autre palier que le palier courant', () => {
    // 2 dessins au palier 1 (insuffisant pour monter), puis un dessin joué au palier 3 (ignoré),
    // puis un 3e dessin au palier 1 réussi : la montée se calcule sur les 3 dessins du palier 1.
    const records = [completedChain(1, 1), completedChain(1, 1), completedChain(3, 1), completedChain(1, 1)];
    expect(autoTier(records)).toBe(2);
  });
});

describe('currentTier', () => {
  it('palier forcé par le parent, ignore l’automatique', () => {
    const records = [completedChain(1, 1), completedChain(1, 1), completedChain(1, 1)];
    expect(currentTier(records, 4)).toBe(4);
  });

  it('sans réglage, utilise le palier automatique', () => {
    const records = [completedChain(1, 1), completedChain(1, 1), completedChain(1, 1)];
    expect(currentTier(records)).toBe(2);
  });
});

describe('proposeDrawings', () => {
  const ids = ['house', 'tree', 'boat', 'car'];

  it('propose 3 dessins distincts', () => {
    const proposed = proposeDrawings([], ids, 1);
    expect(proposed.length).toBe(3);
    expect(new Set(proposed).size).toBe(3);
  });

  it('ne propose jamais le dernier dessin terminé', () => {
    const records = [record({ drawingId: 'house', endedAt: 1000 })];
    const proposed = proposeDrawings(records, ids, 1);
    expect(proposed).not.toContain('house');
  });

  it('propose le favori en premier (terminé au moins 2 fois, le plus)', () => {
    const records = [
      record({ drawingId: 'tree', endedAt: 1000 }),
      record({ drawingId: 'tree', endedAt: 2000 }),
      record({ drawingId: 'boat', endedAt: 3000 }),
    ];
    const proposed = proposeDrawings(records, ids, 1);
    expect(proposed[0]).toBe('tree');
  });

  it('sans favori (aucun dessin fini 2 fois), place les jamais terminés en premier', () => {
    const records = [record({ drawingId: 'house', endedAt: 1000 })];
    const proposed = proposeDrawings(records, ids, 1);
    // 'house' est le dernier terminé, exclu. Les jamais joués (tree, boat, car) passent avant.
    expect(proposed.length).toBe(3);
    expect(proposed).not.toContain('house');
  });

  it('déterministe par graine', () => {
    const a = proposeDrawings([], ids, 7);
    const b = proposeDrawings([], ids, 7);
    expect(a).toEqual(b);
  });
});

const HOUSE: Drawing = {
  id: 'house',
  background: [
    {
      kind: 'zone',
      id: 'a',
      shape: [{ kind: 'rect', x: 0, y: 0, w: 10, h: 10 }],
      anchor: { x: 5, y: 5 },
      detail: 1,
      palette: ['red'],
    },
    {
      kind: 'zone',
      id: 'b',
      shape: [{ kind: 'rect', x: 20, y: 0, w: 10, h: 10 }],
      anchor: { x: 25, y: 5 },
      detail: 1,
      palette: ['blue'],
    },
  ],
  subjects: [{ figure: 'house', endAnimation: 'pop', layers: [] }],
};

function findDrawing(id: string): Drawing | undefined {
  return id === 'house' ? HOUSE : undefined;
}

describe('resumableRecord', () => {
  it('reprenable : abandonnée (time-up), une case non peinte, dessin inchangé au catalogue', () => {
    const r = record({ status: 'abandoned', endReason: 'time-up', paintedAtStart: ['a'] });
    expect(resumableRecord([r], findDrawing)).toBe(r);
  });

  it('reprenable : abandonnée (closed)', () => {
    const r = record({ status: 'abandoned', endReason: 'closed', paintedAtStart: ['a'] });
    expect(resumableRecord([r], findDrawing)).toBe(r);
  });

  it('reprenable : abandonnée (quit) — la logique de reprise ne distingue pas la raison ici', () => {
    const r = record({ status: 'abandoned', endReason: 'quit', paintedAtStart: ['a'] });
    expect(resumableRecord([r], findDrawing)).toBe(r);
  });

  it('non reprenable : partie déjà complétée', () => {
    const r = record({ status: 'completed', paintedAtStart: ['a', 'b'] });
    expect(resumableRecord([r], findDrawing)).toBe(null);
  });

  it('non reprenable : plus aucune case non peinte', () => {
    const r = record({ status: 'abandoned', endReason: 'quit', paintedAtStart: ['a', 'b'] });
    expect(resumableRecord([r], findDrawing)).toBe(null);
  });

  it('non reprenable : le dessin a disparu du catalogue', () => {
    const r = record({ status: 'abandoned', endReason: 'quit', drawingId: 'ghost', paintedAtStart: ['a'] });
    expect(resumableRecord([r], findDrawing)).toBe(null);
  });

  it('non reprenable : les ids de cases ont changé au catalogue', () => {
    const r = record({
      status: 'abandoned',
      endReason: 'quit',
      paintedAtStart: [],
      zones: [
        { id: 'a', target: 'red' },
        { id: 'old-id', target: 'blue' },
      ],
    });
    expect(resumableRecord([r], findDrawing)).toBe(null);
  });

  it('non reprenable : ce n’est pas la dernière partie du profil', () => {
    const old = record({ status: 'abandoned', endReason: 'quit', startedAt: 1, paintedAtStart: ['a'] });
    const recent = record({ status: 'completed', startedAt: 2, paintedAtStart: ['a', 'b'] });
    expect(resumableRecord([old, recent], findDrawing)).toBe(null);
  });
});

describe('fridgeItems', () => {
  it('les 12 derniers dessins terminés, les plus récents en premier', () => {
    const records = Array.from({ length: 15 }, (_, i) => record({ endedAt: i, status: 'completed' }));
    const items = fridgeItems(records);
    expect(items.length).toBe(12);
    expect(items[0]?.endedAt).toBe(14);
    expect(items[11]?.endedAt).toBe(3);
  });

  it('ignore les parties non terminées', () => {
    const records = [record({ status: 'completed', endedAt: 1 }), record({ status: 'abandoned', endedAt: 2 })];
    expect(fridgeItems(records).length).toBe(1);
  });
});
