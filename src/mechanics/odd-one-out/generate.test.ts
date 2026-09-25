import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { OddOneOutParams } from '../../engine/types';
import { getObject } from '../../ui/objects';
import { generateRounds } from './generate';
import type { OddOneOutItem, OddOneOutRoundData } from './types';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1); // « beaucoup de graines »

function oooParams(overrides: Partial<OddOneOutParams> = {}): OddOneOutParams {
  return {
    items: 4,
    differBy: 'color',
    colors: ['red', 'blue', 'yellow', 'green'],
    shapes: ['circle', 'square', 'triangle', 'star'],
    distract: false,
    ...overrides,
  };
}

function asTokenItem(item: OddOneOutItem) {
  if (item.kind !== 'token') throw new Error('attendu un item "token"');
  return item;
}

function asObjectItem(item: OddOneOutItem) {
  if (item.kind !== 'object') throw new Error('attendu un item "object"');
  return item;
}

/** Valeur de l'item sur la dimension demandée (couleur/forme/catégorie). */
function primaryValue(item: OddOneOutItem, differBy: OddOneOutParams['differBy']): string {
  if (differBy === 'category') return getObject(asObjectItem(item).objectId)?.category ?? '';
  return differBy === 'shape' ? asTokenItem(item).token.shape : asTokenItem(item).token.color;
}

/** Valeur de l'item sur l'autre dimension (forme si differBy=color, couleur si differBy=shape). */
function secondaryValue(item: OddOneOutItem, differBy: 'color' | 'shape'): string {
  const token = asTokenItem(item).token;
  return differBy === 'color' ? token.shape : token.color;
}

function findAnswerItem(data: OddOneOutRoundData, answer: string): OddOneOutItem {
  const found = data.items.find((it) => it.id === answer);
  if (!found) throw new Error('réponse introuvable parmi les items');
  return found;
}

describe('oddOneOut.generateRounds', () => {
  describe.each(['color', 'shape'] as const)('differBy "%s"', (differBy) => {
    it('exactement un intrus, unique sur la dimension demandée', () => {
      const params = oooParams({ differBy, items: 5 });
      for (const seed of SEEDS) {
        for (const round of generateRounds(params, 3, createRng(seed))) {
          const normals = round.data.items.filter((it) => it.id !== round.answer);
          const normalValues = new Set(normals.map((it) => primaryValue(it, differBy)));
          const oddValue = primaryValue(findAnswerItem(round.data, round.answer), differBy);

          expect(normalValues.size).toBe(1); // tous les normaux partagent la même valeur
          expect(normalValues.has(oddValue)).toBe(false); // l'intrus diffère bien, et seulement lui
        }
      }
    });

    it('la réponse est l\'id de l\'intrus (présent parmi les items)', () => {
      const params = oooParams({ differBy });
      for (const round of generateRounds(params, 6, createRng(5))) {
        expect(round.data.items.map((it) => it.id)).toContain(round.answer);
      }
    });

    it('distract=false : la dimension « autre » est identique pour tous, intrus compris', () => {
      const params = oooParams({ differBy, distract: false });
      for (const round of generateRounds(params, 5, createRng(9))) {
        const values = new Set(round.data.items.map((it) => secondaryValue(it, differBy)));
        expect(values.size).toBe(1);
      }
    });

    it('distract=true : la dimension « autre » varie chez les normaux, l\'intrus y partage une valeur avec au moins un normal', () => {
      const params = oooParams({ differBy, distract: true, items: 6 });
      let sawVariety = false;
      for (const seed of SEEDS) {
        for (const round of generateRounds(params, 3, createRng(seed))) {
          const normals = round.data.items.filter((it) => it.id !== round.answer);
          const normalSecondary = normals.map((it) => secondaryValue(it, differBy));
          const oddSecondary = secondaryValue(findAnswerItem(round.data, round.answer), differBy);
          if (new Set(normalSecondary).size > 1) sawVariety = true;
          expect(normalSecondary).toContain(oddSecondary); // la forme/couleur ne trahit pas l'intrus
        }
      }
      expect(sawVariety).toBe(true); // le réservoir permettait bien de la variété
    });

    it('ids "item-<index>"', () => {
      const params = oooParams({ differBy });
      const [round] = generateRounds(params, 1, createRng(1));
      round!.data.items.forEach((it, i) => expect(it.id).toBe(`item-${i}`));
    });

    it('positions de l\'intrus variées sur beaucoup de graines', () => {
      const params = oooParams({ differBy, items: 5 });
      const positions = new Set<number>();
      for (const seed of SEEDS) {
        const [round] = generateRounds(params, 1, createRng(seed));
        positions.add(round!.data.items.findIndex((it) => it.id === round!.answer));
      }
      expect(positions.size).toBeGreaterThan(1);
    });

    it('déterminisme : même graine → mêmes manches', () => {
      const params = oooParams({ differBy });
      const a = generateRounds(params, 6, createRng(42));
      const b = generateRounds(params, 6, createRng(42));
      expect(a).toEqual(b);
    });

    it('deux manches consécutives ne sont jamais identiques (réservoir suffisant)', () => {
      const params = oooParams({ differBy, items: 4 });
      const rounds = generateRounds(params, 15, createRng(4));
      for (let i = 1; i < rounds.length; i += 1) {
        expect(rounds[i]).not.toEqual(rounds[i - 1]);
      }
    });

    it('réservoir absent pour la dimension « autre » : repli sans erreur', () => {
      const params: OddOneOutParams =
        differBy === 'color'
          ? { items: 4, differBy, colors: ['red', 'blue'], distract: false }
          : { items: 4, differBy, shapes: ['circle', 'square'], distract: false };
      expect(() => generateRounds(params, 5, createRng(1))).not.toThrow();

      const fallback = differBy === 'color' ? 'circle' : 'blue';
      for (const round of generateRounds(params, 3, createRng(2))) {
        for (const it of round.data.items) {
          expect(secondaryValue(it, differBy)).toBe(fallback);
        }
      }
    });
  });

  describe('differBy "category"', () => {
    const categoryParams = (overrides: Partial<OddOneOutParams> = {}): OddOneOutParams => ({
      items: 5,
      differBy: 'category',
      categories: ['fruit', 'animal', 'vehicle', 'toy'],
      distract: false,
      ...overrides,
    });

    it('exactement un intrus, catégorie unique parmi les normaux', () => {
      for (const seed of SEEDS) {
        for (const round of generateRounds(categoryParams(), 3, createRng(seed))) {
          const normals = round.data.items.filter((it) => it.id !== round.answer);
          const normalCats = new Set(normals.map((it) => primaryValue(it, 'category')));
          const oddCat = primaryValue(findAnswerItem(round.data, round.answer), 'category');
          expect(normalCats.size).toBe(1);
          expect(normalCats.has(oddCat)).toBe(false);
        }
      }
    });

    it('distract=false : le même objet est répété pour tous les normaux', () => {
      for (const round of generateRounds(categoryParams({ distract: false }), 5, createRng(3))) {
        const normals = round.data.items.filter((it) => it.id !== round.answer);
        const ids = new Set(normals.map((it) => asObjectItem(it).objectId));
        expect(ids.size).toBe(1);
      }
    });

    it('distract=true : des objets distincts de la catégorie, aussi variés que possible', () => {
      let sawVariety = false;
      for (const seed of SEEDS) {
        for (const round of generateRounds(categoryParams({ distract: true, items: 6 }), 3, createRng(seed))) {
          const normals = round.data.items.filter((it) => it.id !== round.answer);
          if (new Set(normals.map((it) => asObjectItem(it).objectId)).size > 1) sawVariety = true;
        }
      }
      expect(sawVariety).toBe(true);
    });

    it('la réponse est l\'id de l\'intrus (présent parmi les items)', () => {
      for (const round of generateRounds(categoryParams(), 6, createRng(2))) {
        expect(round.data.items.map((it) => it.id)).toContain(round.answer);
      }
    });

    it('positions de l\'intrus variées sur beaucoup de graines', () => {
      const positions = new Set<number>();
      for (const seed of SEEDS) {
        const [round] = generateRounds(categoryParams(), 1, createRng(seed));
        positions.add(round!.data.items.findIndex((it) => it.id === round!.answer));
      }
      expect(positions.size).toBeGreaterThan(1);
    });

    it('déterminisme : même graine → mêmes manches', () => {
      const params = categoryParams();
      const a = generateRounds(params, 6, createRng(11));
      const b = generateRounds(params, 6, createRng(11));
      expect(a).toEqual(b);
    });

    it('deux manches consécutives ne sont jamais identiques (réservoir suffisant)', () => {
      const rounds = generateRounds(categoryParams({ distract: true, items: 4 }), 15, createRng(4));
      for (let i = 1; i < rounds.length; i += 1) {
        expect(rounds[i]).not.toEqual(rounds[i - 1]);
      }
    });
  });

  it('génère exactement `items` éléments par manche, quel que soit differBy', () => {
    for (const differBy of ['color', 'shape', 'category'] as const) {
      const params = oooParams({ differBy, items: 6, categories: ['fruit', 'animal'] });
      for (const round of generateRounds(params, 3, createRng(1))) {
        expect(round.data.items).toHaveLength(6);
      }
    }
  });
});
