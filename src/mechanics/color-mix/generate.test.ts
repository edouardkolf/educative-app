import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { Color, ColorMixParams } from '../../engine/types';
import { generateRounds, mixColors, recipeFor } from './generate';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

function params(overrides: Partial<ColorMixParams> = {}): ColorMixParams {
  return { targets: ['orange', 'green', 'purple'], ...overrides };
}

describe('mixColors', () => {
  it('donne le bon résultat pour chaque paire, indépendamment de l\'ordre', () => {
    const cases: [Color, Color, Color][] = [
      ['red', 'yellow', 'orange'],
      ['yellow', 'red', 'orange'],
      ['blue', 'yellow', 'green'],
      ['yellow', 'blue', 'green'],
      ['red', 'blue', 'purple'],
      ['blue', 'red', 'purple'],
    ];
    for (const [a, b, expected] of cases) {
      expect(mixColors(a, b)).toBe(expected);
      expect(mixColors(b, a)).toBe(expected);
    }
  });

  it('une couleur primaire versée deux fois donne la même couleur', () => {
    expect(mixColors('red', 'red')).toBe('red');
    expect(mixColors('yellow', 'yellow')).toBe('yellow');
    expect(mixColors('blue', 'blue')).toBe('blue');
  });
});

describe('recipeFor', () => {
  it('donne une recette dont le mélange redonne bien la cible', () => {
    const targets: Color[] = ['red', 'yellow', 'blue', 'orange', 'green', 'purple'];
    for (const target of targets) {
      const [a, b] = recipeFor(target);
      expect(mixColors(a, b)).toBe(target);
    }
  });
});

describe('color-mix.generateRounds', () => {
  it('génère exactement `count` manches, réponse = cible', () => {
    for (const seed of SEEDS) {
      const rounds = generateRounds(params(), 5, createRng(seed));
      expect(rounds).toHaveLength(5);
      for (const round of rounds) {
        expect(round.answer).toBe(round.data.target);
        expect(params().targets).toContain(round.data.target);
      }
    }
  });

  it('jamais deux fois la même cible de suite (réservoir ≥ 2)', () => {
    for (const seed of SEEDS) {
      const rounds = generateRounds(params(), 8, createRng(seed));
      for (let i = 1; i < rounds.length; i += 1) {
        expect(rounds[i]?.data.target).not.toBe(rounds[i - 1]?.data.target);
      }
    }
  });

  it('couvre toutes les cibles dès que count ≥ targets.length', () => {
    for (const seed of SEEDS) {
      const rounds = generateRounds(params(), 3, createRng(seed));
      const seen = new Set(rounds.map((r) => r.data.target));
      expect(seen).toEqual(new Set(params().targets));
    }
  });

  it('avec une seule cible possible, la répète sans planter', () => {
    const rounds = generateRounds({ targets: ['red'] }, 4, createRng(1));
    expect(rounds.every((r) => r.data.target === 'red')).toBe(true);
  });
});
