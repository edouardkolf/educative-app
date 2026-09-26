import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { ReadParams } from '../../engine/types';
import { generateRounds } from './generate';
import { describeRoundKinds, validateParams } from './validate';

const VALID: ReadParams = { traps: ['noun'], relations: ['on'], sentences: 1, choices: 3 };

/** Les 7 niveaux ce1-lire-01..07 annoncés par le coordinateur. */
const LEVEL_PARAMS: Record<string, ReadParams> = {
  'ce1-lire-01': { traps: ['noun'], relations: ['on'], sentences: 1, choices: 3 },
  'ce1-lire-02': { traps: ['number', 'noun'], relations: ['on', 'beside'], sentences: 1, choices: 4 },
  'ce1-lire-03': { traps: ['position'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 },
  'ce1-lire-04': { traps: ['position'], relations: ['on', 'beside', 'in-front'], sentences: 1, choices: 3 },
  'ce1-lire-05': {
    traps: ['negation', 'number', 'position'],
    relations: ['on', 'under', 'beside'],
    sentences: 1,
    choices: 3,
  },
  'ce1-lire-06': {
    traps: ['noun', 'number', 'position', 'negation'],
    relations: ['on', 'under', 'beside', 'in-front'],
    sentences: 1,
    choices: 3,
  },
  'ce1-lire-07': {
    traps: ['noun', 'number', 'position'],
    relations: ['on', 'under', 'beside'],
    sentences: 2,
    choices: 4,
  },
};

describe('read/validateParams', () => {
  it('accepte des paramètres valides', () => {
    expect(validateParams(VALID)).toEqual([]);
  });

  it('refuse des pièges vides', () => {
    expect(validateParams({ ...VALID, traps: [] }).length).toBeGreaterThan(0);
  });

  it('refuse des relations vides', () => {
    expect(validateParams({ ...VALID, relations: [] }).length).toBeGreaterThan(0);
  });

  it('refuse un choices hors bornes', () => {
    expect(validateParams({ ...VALID, choices: 2 }).length).toBeGreaterThan(0);
    expect(validateParams({ ...VALID, choices: 5 }).length).toBeGreaterThan(0);
  });

  it('refuse sentences hors bornes', () => {
    expect(validateParams({ ...VALID, sentences: 3 }).length).toBeGreaterThan(0);
  });

  it('refuse "negation" à 4 images', () => {
    const errors = validateParams({ traps: ['negation', 'number'], relations: ['on', 'under'], sentences: 1, choices: 4 });
    expect(errors.some((e) => e.includes('negation'))).toBe(true);
  });

  it('refuse "negation" à 2 phrases', () => {
    const errors = validateParams({ traps: ['negation', 'number'], relations: ['on', 'under'], sentences: 2, choices: 3 });
    expect(errors.some((e) => e.includes('negation'))).toBe(true);
  });

  it('refuse "negation" à 3 images sans "number"', () => {
    const errors = validateParams({ traps: ['negation', 'position'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 });
    expect(errors.some((e) => e.includes('negation') && e.includes('number'))).toBe(true);
  });

  it('accepte "negation"+"number" à 3 images, 1 phrase', () => {
    const errors = validateParams({ traps: ['negation', 'number'], relations: ['on', 'under'], sentences: 1, choices: 3 });
    expect(errors).toEqual([]);
  });

  it('refuse "position" seul quand aucun support n\'a 3 positions dans relations, à choices 3', () => {
    // "beside" est la seule position commune à tous les supports isolément suffisante : avec un seul
    // support à 3 positions retiré du champ, on force l'irréalisabilité (voir ANCHOR_RELATIONS).
    const errors = validateParams({ traps: ['position'], relations: ['under'], sentences: 1, choices: 3 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('refuse "number" seul à 3 images (jamais 3 valeurs distinctes)', () => {
    const errors = validateParams({ traps: ['number'], relations: ['on'], sentences: 1, choices: 3 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('refuse "number" seul à 4 images (un seul trait disponible, pas de plan croisé)', () => {
    const errors = validateParams({ traps: ['number'], relations: ['on'], sentences: 1, choices: 4 });
    expect(errors.length).toBeGreaterThan(0);
  });

  describe('les 7 niveaux ce1-lire-01..07', () => {
    for (const [id, params] of Object.entries(LEVEL_PARAMS)) {
      it(`${id} : paramètres acceptés et manches générées`, () => {
        expect(validateParams(params)).toEqual([]);
        const rounds = generateRounds(params, 6, createRng(1));
        expect(rounds).toHaveLength(6);
        for (const round of rounds) {
          expect(round.data.choices).toHaveLength(params.choices);
        }
      });

      it(`${id} : décrit au moins un type de manche`, () => {
        expect(describeRoundKinds(params).length).toBeGreaterThan(0);
      });
    }
  });
});
