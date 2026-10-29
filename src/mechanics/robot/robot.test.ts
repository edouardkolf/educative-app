import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { RobotParams } from '../../engine/types';
import { generateRounds } from './generate';
import { move, runProgram, shortestPath } from './logic';
import type { Grid } from './types';
import { validateRobot } from './validate';

const grid: Grid = { size: 4, rocks: [{ x: 1, y: 0 }, { x: 1, y: 1 }] };

describe('move', () => {
  it('déplace en absolu', () => {
    expect(move(grid, { x: 0, y: 0 }, 'down')).toEqual({ x: 0, y: 1 });
    expect(move(grid, { x: 0, y: 1 }, 'right')).toBeNull(); // rocher
  });
  it('refuse de sortir de la grille', () => {
    expect(move(grid, { x: 0, y: 0 }, 'up')).toBeNull();
    expect(move(grid, { x: 3, y: 3 }, 'right')).toBeNull();
    expect(move(grid, { x: 3, y: 3 }, 'down')).toBeNull();
    expect(move(grid, { x: 0, y: 0 }, 'left')).toBeNull();
  });
});

describe('shortestPath', () => {
  it('contourne les rochers', () => {
    const path = shortestPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }) ?? [];
    expect(path.length).toBe(6);
  });
  it('renvoie null si le trésor est enfermé', () => {
    const closed: Grid = { size: 4, rocks: [{ x: 1, y: 0 }, { x: 0, y: 1 }] };
    expect(shortestPath(closed, { x: 3, y: 3 }, { x: 0, y: 0 })).toBeNull();
  });
  it('est vide quand départ = trésor', () => {
    expect(shortestPath(grid, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
  });
});

describe('runProgram', () => {
  const open: Grid = { size: 4, rocks: [{ x: 2, y: 1 }] };
  const start = { x: 0, y: 1 };
  const goal = { x: 1, y: 1 };
  it('réussit en finissant sur le trésor', () => {
    const r = runProgram(open, start, goal, ['right']);
    expect(r.outcome).toBe('goal');
    expect(r.trace).toEqual([start, goal]);
  });
  it('passer sur le trésor en route n\'est pas une réussite', () => {
    const r = runProgram(open, start, goal, ['right', 'down']);
    expect(r.outcome).toBe('stopped');
  });
  it('signale le choc et son étape', () => {
    const r = runProgram(open, start, goal, ['right', 'right', 'down']);
    expect(r.outcome).toBe('blocked');
    expect(r.blockedAt).toBe(1);
    expect(r.trace.length).toBe(2);
  });
  it('un programme vide s\'arrête au départ', () => {
    expect(runProgram(open, start, goal, []).outcome).toBe('stopped');
  });
});

const stepParams: RobotParams = { size: 4, obstacles: 2, mode: 'step', pathLength: { min: 2, max: 4 } };
const programParams: RobotParams = { size: 6, obstacles: 8, mode: 'program', pathLength: { min: 6, max: 9 }, maxArrows: 10 };

describe('generateRounds', () => {
  it.each([stepParams, programParams])('garantit un chemin dans la plage (50 graines)', (params) => {
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const round of generateRounds(params, 3, createRng(seed))) {
        const d = round.data;
        const len = shortestPath({ size: d.size, rocks: d.rocks }, d.start, d.goal)?.length;
        expect(len).toBeGreaterThanOrEqual(params.pathLength.min);
        expect(len).toBeLessThanOrEqual(params.pathLength.max);
        expect(d.minMoves).toBe(len);
        expect(d.rocks.length).toBe(params.obstacles);
        expect(round.answer).toBe('goal');
      }
    }
  });
  it('est déterministe', () => {
    expect(generateRounds(programParams, 4, createRng(7))).toEqual(generateRounds(programParams, 4, createRng(7)));
  });
  it('produit des manches distinctes', () => {
    const rounds = generateRounds(stepParams, 5, createRng(3));
    expect(new Set(rounds.map((r) => JSON.stringify(r.data))).size).toBe(5);
  });
  it('échoue clairement si infaisable', () => {
    expect(() => generateRounds({ ...stepParams, pathLength: { min: 11, max: 12 } }, 1, createRng(1))).toThrow(/robot/);
  });
});

describe('validateRobot', () => {
  it('accepte des paramètres valides', () => {
    expect(validateRobot(stepParams)).toEqual([]);
    expect(validateRobot(programParams)).toEqual([]);
  });
  it('rejette les incohérences', () => {
    expect(validateRobot({ ...stepParams, pathLength: { min: 1, max: 3 } })).not.toEqual([]);
    expect(validateRobot({ ...stepParams, pathLength: { min: 2, max: 11 } })).not.toEqual([]);
    expect(validateRobot({ ...stepParams, obstacles: 6 })).not.toEqual([]);
    expect(validateRobot({ ...programParams, maxArrows: undefined })).not.toEqual([]);
    expect(validateRobot({ ...programParams, maxArrows: 8 })).not.toEqual([]);
    expect(validateRobot({ ...stepParams, maxArrows: 5 })).not.toEqual([]);
  });
});
