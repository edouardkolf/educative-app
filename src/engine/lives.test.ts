import { describe, expect, it } from 'vitest';
import { getLevel, getTracks } from './content';
import { livesFor, randomPassRate } from './lives';
import type { Level } from './types';

function level(partial: Record<string, unknown>): Level {
  return { id: 'x', title: 'x', skill: 'patterns', rounds: 5, ...partial } as unknown as Level;
}

const choices = (n: number, rounds: number) => level({ mechanic: 'sequence', rounds, params: { choices: n } });

describe('livesFor', () => {
  it('2 choix : 2 vies, le hasard y réussit trop souvent pour en donner plus', () => {
    expect(livesFor(choices(2, 4))).toBe(2);
    expect(livesFor(choices(2, 5))).toBe(2);
  });

  it('plus de choix ou plus de manches : plus de vies', () => {
    expect(livesFor(choices(3, 4))).toBe(2);
    expect(livesFor(choices(3, 5))).toBe(3);
    expect(livesFor(choices(3, 8))).toBe(4);
    expect(livesFor(choices(4, 5))).toBe(3);
    expect(livesFor(choices(4, 6))).toBe(4);
  });

  it('jeux sans hasard (pavé, constructeur) : jamais plus de vies que de manches', () => {
    expect(livesFor(level({ mechanic: 'builder', rounds: 3, params: { figures: ['house'], distractors: 0 } }))).toBe(3);
    expect(livesFor(level({ mechanic: 'calc', rounds: 6, params: { answer: 'keypad' } }))).toBe(4);
  });

  it('`lives` dans le niveau force la valeur', () => {
    expect(livesFor(level({ mechanic: 'sequence', lives: 5, params: { choices: 2 } }))).toBe(5);
  });

  it('au-delà de 2 vies, le hasard termine au plus 1 partie sur 4, sur tout le contenu', () => {
    for (const track of getTracks()) {
      for (const id of track.levels) {
        const lvl = getLevel(id)!;
        const lives = livesFor(lvl);
        expect(lives).toBeGreaterThanOrEqual(2);
        expect(lives).toBeLessThanOrEqual(Math.max(2, Math.min(4, lvl.rounds)));
        if (lives > 2) expect(randomPassRate(lvl, lives)).toBeLessThanOrEqual(0.25);
      }
    }
  });
});

describe('randomPassRate', () => {
  it('2 choix, 4 manches, 2 vies : au plus 1 manche ratée sur 4 → 5/16', () => {
    expect(randomPassRate(choices(2, 4), 2)).toBeCloseTo(5 / 16);
  });
});
