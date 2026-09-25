import { describe, expect, it } from 'vitest';
import { computeStars, countMisses } from './scoring';
import type { Level } from './types';
import type { RoundRecord } from '../storage/types';

function round(firstTry: boolean): RoundRecord {
  return { index: 0, taps: firstTry ? 1 : 2, firstTry, durationMs: 1000 };
}

function makeLevel(stars?: Level['stars']): Level {
  return {
    id: 'test-level',
    title: 'Niveau de test',
    skill: 'patterns',
    objective: 'Objectif de test.',
    mechanic: 'sequence',
    rounds: 4,
    params: {
      pattern: 'AB',
      vary: 'color',
      colors: ['red', 'blue'],
      shapes: ['circle'],
      length: 4,
      blank: 'end',
      choices: 2,
    },
    stars,
  };
}

describe('countMisses', () => {
  it('compte les manches non réussies du premier coup', () => {
    const rounds = [round(true), round(false), round(true), round(false), round(false)];
    expect(countMisses(rounds)).toBe(3);
  });

  it('vaut 0 si toutes les manches sont réussies du premier coup', () => {
    expect(countMisses([round(true), round(true)])).toBe(0);
  });

  it('vaut 0 pour une liste vide', () => {
    expect(countMisses([])).toBe(0);
  });
});

describe('computeStars', () => {
  const level = makeLevel(); // pas de seuils personnalisés → défauts (0 puis 1)

  it('3 étoiles par défaut si 0 manche ratée', () => {
    expect(computeStars(level, 0)).toBe(3);
  });

  it('2 étoiles par défaut si 1 manche ratée', () => {
    expect(computeStars(level, 1)).toBe(2);
  });

  it('1 étoile par défaut si 2 manches ratées ou plus', () => {
    expect(computeStars(level, 2)).toBe(1);
    expect(computeStars(level, 5)).toBe(1);
  });

  it('respecte des seuils personnalisés (stars.maxMissesFor3 / maxMissesFor2)', () => {
    const custom = makeLevel({ maxMissesFor3: 2, maxMissesFor2: 4 });
    expect(computeStars(custom, 0)).toBe(3);
    expect(computeStars(custom, 2)).toBe(3);
    expect(computeStars(custom, 3)).toBe(2);
    expect(computeStars(custom, 4)).toBe(2);
    expect(computeStars(custom, 5)).toBe(1);
  });

  it('rapporte toujours au moins 1 étoile, même avec beaucoup de manches ratées', () => {
    expect(computeStars(level, 999)).toBeGreaterThanOrEqual(1);
  });
});
