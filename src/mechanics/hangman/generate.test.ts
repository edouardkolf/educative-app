import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { HangmanParams } from '../../engine/types';
import { HANGMAN_WORDS } from '../../games/hangman/words';
import { filterPool, generateRounds, nextWordIndex } from './generate';
import { validateHangman } from './validate';

const params: HangmanParams = { maxMistakes: 8 };

describe('filterPool', () => {
  it('sans filtre : tout le catalogue', () => expect(filterPool(params)).toHaveLength(HANGMAN_WORDS.length));
  it('filtre par ids, ignore les inconnus et les doublons', () => {
    expect(filterPool({ ...params, words: ['lion', 'ours', 'lion', 'nope'] }).map((w) => w.id)).toEqual(['lion', 'ours']);
  });
  it('filtre par longueur', () => {
    const pool = filterPool({ ...params, minLength: 4, maxLength: 5 });
    expect(pool.length).toBeGreaterThan(5);
    expect(pool.every((w) => w.word.length >= 4 && w.word.length <= 5)).toBe(true);
  });
});

describe('generateRounds', () => {
  it('un mot principal + 2 réserves, tous distincts, answer = id du principal', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const rounds = generateRounds({ ...params, maxLength: 6 }, 3, createRng(seed));
      expect(rounds).toHaveLength(3);
      const ids = rounds.flatMap((r) => r.data.words.map((w) => w.id));
      expect(ids).toHaveLength(9);
      expect(new Set(ids).size).toBe(9);
      rounds.forEach((r) => {
        expect(r.answer).toBe(r.data.words[0]?.id);
        expect(r.data.maxMistakes).toBe(8);
        expect(r.data.words.every((w) => w.word.length <= 6)).toBe(true);
      });
    }
  });
  it('déterministe', () => {
    expect(generateRounds(params, 4, createRng(3))).toEqual(generateRounds(params, 4, createRng(3)));
  });
  it('réserves réduites si le pool est juste, erreur s\'il manque des mots', () => {
    const ids = HANGMAN_WORDS.slice(0, 4).map((w) => w.id);
    const rounds = generateRounds({ ...params, words: ids }, 3, createRng(1));
    expect(rounds.map((r) => r.data.words.length)).toEqual([1, 1, 1]);
    expect(() => generateRounds({ ...params, words: ids }, 5, createRng(1))).toThrow();
  });
  it('nextWordIndex boucle', () => {
    expect(nextWordIndex(0, 3)).toBe(1);
    expect(nextWordIndex(2, 3)).toBe(0);
  });
});

describe('validateHangman', () => {
  it('accepte le catalogue entier', () => expect(validateHangman(params)).toEqual([]));
  it('refuse ids inconnus, min > max, pool trop petit, pétales hors bornes', () => {
    expect(validateHangman({ ...params, words: ['zzz'] }).join()).toMatch(/inconnus/);
    expect(validateHangman({ ...params, minLength: 6, maxLength: 4 }).join()).toMatch(/minLength/);
    expect(validateHangman({ ...params, words: ['lion', 'ours'] }).join()).toMatch(/au moins 9/);
    expect(validateHangman({ ...params, maxMistakes: 3 }).join()).toMatch(/maxMistakes/);
  });
});
