import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { MazeParams } from '../../engine/types';
import { generateRounds } from './generate';
import { addStrike, canMove, createMaze, distancesFrom, solutionPath, stepTrail, stepTrailLenient } from './logic';
import { maze as mazeMechanic } from './index';
import type { Cell } from './types';
import { validateMaze } from './validate';

describe('createMaze', () => {
  it('est parfait : toutes les cases reliées, passages = cases − 1', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const size of [4, 5, 7]) {
        const m = createMaze(size, createRng(seed));
        const edges = m.right.filter(Boolean).length + m.down.filter(Boolean).length;
        expect(edges).toBe(size * size - 1);
        expect(distancesFrom(m, { r: 0, c: 0 }).every((d) => d >= 0)).toBe(true);
        // pas de passage qui sort de la grille
        for (let i = 0; i < size * size; i += 1) {
          if (i % size === size - 1) expect(m.right[i]).toBe(false);
          if (i >= size * (size - 1)) expect(m.down[i]).toBe(false);
        }
      }
    }
  });
  it('est déterministe', () => {
    expect(createMaze(5, createRng(3))).toEqual(createMaze(5, createRng(3)));
  });
});

describe('canMove / solutionPath', () => {
  const m = createMaze(5, createRng(11));
  it('refuse non voisines, diagonales, hors grille, et accepte un passage ouvert dans les deux sens', () => {
    expect(canMove(m, { r: 0, c: 0 }, { r: 1, c: 1 })).toBe(false);
    expect(canMove(m, { r: 0, c: 0 }, { r: 0, c: 2 })).toBe(false);
    expect(canMove(m, { r: 0, c: 0 }, { r: -1, c: 0 })).toBe(false);
    let found = 0;
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const a = { r, c };
        const b = { r, c: c + 1 };
        expect(canMove(m, a, b)).toBe(canMove(m, b, a));
        if (canMove(m, a, b)) found += 1;
      }
    }
    expect(found).toBeGreaterThan(0);
  });
  it('trouve un chemin valide, sans mur, de départ à arrivée', () => {
    const start = { r: 0, c: 0 };
    const goal = { r: 4, c: 4 };
    const path = solutionPath(m, start, goal) as Cell[];
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(goal);
    for (let i = 1; i < path.length; i += 1) expect(canMove(m, path[i - 1] as Cell, path[i] as Cell)).toBe(true);
    expect(path.length).toBe((distancesFrom(m, start)[24] as number) + 1);
    expect(solutionPath(m, start, start)).toEqual([start]);
  });
});

describe('stepTrail', () => {
  const m = createMaze(4, createRng(5));
  const path = solutionPath(m, { r: 0, c: 0 }, { r: 3, c: 3 }) as Cell[];
  it('avance, recule, refuse', () => {
    const t1 = stepTrail(m, [path[0] as Cell], path[1] as Cell);
    expect(t1.kind).toBe('forward');
    expect(stepTrail(m, t1.trail, path[0] as Cell).kind).toBe('back');
    expect(stepTrail(m, t1.trail, path[1] as Cell).kind).toBe('same');
    expect(stepTrail(m, t1.trail, path[3] as Cell).kind).toBe('blocked');
  });
});

describe('règle des 3 chocs', () => {
  it('émet une seule fois, au 3e', () => {
    let count = 0;
    const emits: boolean[] = [];
    for (let i = 0; i < 5; i += 1) {
      const s = addStrike(count);
      count = s.count;
      emits.push(s.emit);
    }
    expect(emits).toEqual([false, false, true, false, false]);
  });
});

describe('generateRounds', () => {
  const cases: MazeParams[] = [
    { size: 4, mode: 'tap', minPath: 7 },
    { size: 5, mode: 'tap', minPath: 11 },
    { size: 6, mode: 'trace', minPath: 14 },
    { size: 7, mode: 'trace', minPath: 20 },
  ];
  it('respecte minPath sur 50 graines', () => {
    for (const p of cases) {
      for (let seed = 1; seed <= 50; seed += 1) {
        for (const r of generateRounds(p, 3, createRng(seed))) {
          const d = r.data;
          const path = solutionPath(d.maze, d.start, d.goal) as Cell[];
          expect(path.length).toBeGreaterThanOrEqual(p.minPath);
          expect(r.answer).toBe('arrived');
          expect(d.mode).toBe(p.mode);
        }
      }
    }
  });
  it('est déterministe et donne des manches distinctes', () => {
    const p = cases[1] as MazeParams;
    const a = generateRounds(p, 5, createRng(9));
    expect(generateRounds(p, 5, createRng(9))).toEqual(a);
    expect(new Set(a.map((r) => JSON.stringify([r.data.maze, r.data.start, r.data.goal]))).size).toBe(5);
  });
  it('tutorialTargets donne les premières cases du chemin', () => {
    const r = generateRounds(cases[0] as MazeParams, 1, createRng(2))[0]!;
    const t = mazeMechanic.tutorialTargets?.(r) ?? [];
    expect(t.length).toBe(3);
    expect(t[0]).toMatch(/^cell-\d-\d$/);
  });
});

describe('validateMaze', () => {
  it('accepte des paramètres cohérents', () => {
    expect(validateMaze({ size: 4, mode: 'tap', minPath: 7 })).toEqual([]);
    expect(validateMaze({ size: 7, mode: 'trace', minPath: 25 })).toEqual([]);
  });
  it('refuse les paramètres incohérents', () => {
    expect(validateMaze({ size: 3, mode: 'tap', minPath: 5 })).not.toEqual([]);
    expect(validateMaze({ size: 5, mode: 'tap', minPath: 4 })).not.toEqual([]);
    expect(validateMaze({ size: 4, mode: 'tap', minPath: 12 })).not.toEqual([]);
  });
});

describe('stepTrailLenient (virage coupé au doigt)', () => {
  it('passe par la case de coin quand les deux pas sont légaux, sans compter de choc', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const m = createMaze(5, createRng(seed));
      const path = solutionPath(m, { r: 0, c: 0 }, { r: 4, c: 4 }) as Cell[];
      for (let i = 0; i + 2 < path.length; i += 1) {
        const [a, b, c] = [path[i]!, path[i + 1]!, path[i + 2]!];
        if (a.r === c.r || a.c === c.c) continue; // pas un virage
        const trail = path.slice(0, i + 1);
        expect(stepTrail(m, trail, c).kind).toBe('blocked');
        const res = stepTrailLenient(m, trail, c);
        expect(res.kind).toBe('forward');
        expect(res.trail).toEqual([...trail, b, c]);
        return;
      }
    }
  });

  it("garde le choc quand aucune case de coin ne relie les deux (vrai mur)", () => {
    const m = createMaze(5, createRng(7));
    const trail = [{ r: 0, c: 0 }];
    const res = stepTrailLenient(m, trail, { r: 2, c: 2 });
    expect(res.kind).toBe('blocked');
  });
});
