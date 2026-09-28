import { describe, expect, it } from 'vitest';
import { applyCupPaint, EMPTY_CUP, paintOf, pourFlask, rinseCup } from './cup';
import type { CupState } from './cup';
import type { Color } from '../../engine/types';

const FLASKS: Color[] = ['red', 'yellow', 'blue'];

describe('paintOf (R1)', () => {
  it('vide : pas de peinture', () => {
    expect(paintOf(EMPTY_CUP)).toBe(null);
  });

  it('une goutte : la peinture est la goutte', () => {
    for (const f of FLASKS) expect(paintOf({ drops: [f], used: false })).toBe(f);
  });

  it('9 combinaisons de deux versements', () => {
    const expected: Record<string, Color> = {
      'red+red': 'red',
      'yellow+yellow': 'yellow',
      'blue+blue': 'blue',
      'red+yellow': 'orange',
      'yellow+red': 'orange',
      'red+blue': 'purple',
      'blue+red': 'purple',
      'blue+yellow': 'green',
      'yellow+blue': 'green',
    };
    for (const [key, color] of Object.entries(expected)) {
      const [a, b] = key.split('+') as [Color, Color];
      expect(paintOf({ drops: [a, b], used: false })).toBe(color);
    }
  });
});

describe('pourFlask (R2, R3)', () => {
  it('R2 : récipient vide, +1 goutte, used repasse à faux', () => {
    const result = pourFlask({ drops: [], used: true }, 'red');
    expect(result).toEqual({ drops: ['red'], used: false });
  });

  it('R2 : récipient à 1 goutte, +1 goutte', () => {
    const result = pourFlask({ drops: ['red'], used: true }, 'blue');
    expect(result).toEqual({ drops: ['red', 'blue'], used: false });
  });

  it('R3 : récipient plein (3e fiole), rinçage puis la goutte seule', () => {
    const result = pourFlask({ drops: ['red', 'blue'], used: false }, 'yellow');
    expect(result).toEqual({ drops: ['yellow'], used: false });
  });

  it('toute couleur en 3 taps au plus, depuis un récipient plein', () => {
    // plein -> une fiole (rinçage + 1 goutte) -> une autre fiole (2e goutte) = 2 taps.
    let cup: CupState = { drops: ['red', 'blue'], used: true };
    cup = pourFlask(cup, 'yellow');
    cup = pourFlask(cup, 'yellow');
    expect(paintOf(cup)).toBe('yellow');
  });
});

describe('rinseCup (R4)', () => {
  it('rince un récipient non vide', () => {
    expect(rinseCup({ drops: ['red', 'blue'], used: true })).toEqual(EMPTY_CUP);
  });

  it('un récipient déjà vide ne change pas', () => {
    expect(rinseCup(EMPTY_CUP)).toBe(EMPTY_CUP);
  });
});

describe('applyCupPaint (R5, fresh)', () => {
  it('première application depuis le versement : fresh', () => {
    const { fresh, cup } = applyCupPaint({ drops: ['red'], used: false });
    expect(fresh).toBe(true);
    expect(cup.used).toBe(true);
  });

  it('applications suivantes : pas fresh, mais la peinture reste', () => {
    const first = applyCupPaint({ drops: ['red'], used: false });
    const second = applyCupPaint(first.cup);
    expect(second.fresh).toBe(false);
    expect(paintOf(second.cup)).toBe('red');
  });
});
