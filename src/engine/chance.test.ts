import { describe, expect, it } from 'vitest';
import { aboveChance, chanceOfFirstTry } from './chance';
import { getLevel, getTracks } from './content';
import type { Level } from './types';

function level(partial: Record<string, unknown>): Level {
  return { id: 'x', title: 'x', skill: 'patterns', rounds: 4, ...partial } as unknown as Level;
}

describe('chanceOfFirstTry', () => {
  it('vaut 1 sur le nombre de propositions pour les jeux à choix', () => {
    expect(chanceOfFirstTry(level({ mechanic: 'sequence', params: { choices: 3 } }))).toBeCloseTo(1 / 3);
    expect(chanceOfFirstTry(level({ mechanic: 'count', params: { choices: 2 } }))).toBe(0.5);
    expect(chanceOfFirstTry(level({ mechanic: 'odd-one-out', params: { items: 4 } }))).toBe(0.25);
    expect(chanceOfFirstTry(level({ mechanic: 'sort', params: { groups: [{}, {}, {}] } }))).toBeCloseTo(1 / 3);
  });

  it('labo des couleurs : 2 chances sur 9 pour une secondaire, 1 sur 9 pour une primaire', () => {
    expect(chanceOfFirstTry(level({ mechanic: 'color-mix', params: { targets: ['orange', 'green'] } }))).toBeCloseTo(
      2 / 9,
    );
    expect(chanceOfFirstTry(level({ mechanic: 'color-mix', params: { targets: ['orange', 'red'] } }))).toBeCloseTo(
      1.5 / 9,
    );
  });

  it('constructeur : réussir une figure au hasard est quasi impossible', () => {
    expect(chanceOfFirstTry(level({ mechanic: 'builder', params: { figures: ['house'], distractors: 0 } }))).toBe(0);
  });

  it('reste entre 0 et 1 pour tous les niveaux du contenu', () => {
    for (const track of getTracks()) {
      for (const id of track.levels) {
        const c = chanceOfFirstTry(getLevel(id)!);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(1);
      }
    }
  });
});

describe('aboveChance', () => {
  it('ramène le hasard à 0 et le sans-faute à 1', () => {
    expect(aboveChance(0.5, 0.5)).toBe(0);
    expect(aboveChance(1, 0.5)).toBe(1);
    expect(aboveChance(0.75, 0.5)).toBeCloseTo(0.5);
  });

  it('50 % vaut bien plus sur un jeu à 4 choix que sur un jeu à 2', () => {
    expect(aboveChance(0.5, 0.25)).toBeGreaterThan(aboveChance(0.5, 0.5));
  });

  it('ne descend pas sous 0 quand on fait pire que le hasard', () => {
    expect(aboveChance(0.2, 1 / 3)).toBe(0);
  });
});
