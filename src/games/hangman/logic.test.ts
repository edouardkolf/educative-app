import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { baseLetter, drawWord, guess, isFound, lettersOf, MAX_MISTAKES, mistakesFor, outcomeFor, slotsFor } from './logic';
import { HANGMAN_WORDS } from './words';

describe('pendu — lettres', () => {
  it('ramène les accents à la lettre de base', () => {
    expect(baseLetter('é')).toBe('e');
    expect(baseLetter('ç')).toBe('c');
    expect(baseLetter('î')).toBe('i');
    expect(baseLetter('A')).toBe('a');
    expect(baseLetter('-')).toBe('');
  });

  it('« e » révèle é, è et ê ; les autres lettres restent cachées', () => {
    const slots = slotsFor('éléphant', ['e']);
    expect(slots.map((s) => (s.revealed ? s.char : '_')).join('')).toBe('é_é_____');
    expect(lettersOf('éléphant')).toEqual(new Set(['e', 'l', 'p', 'h', 'a', 'n', 't']));
  });
});

describe('pendu — partie', () => {
  it('compte les erreurs et trouve le mot', () => {
    expect(mistakesFor('lion', ['a', 'l', 'z'])).toBe(2);
    expect(isFound('lion', ['l', 'i', 'o'])).toBe(false);
    expect(isFound('lion', ['l', 'i', 'o', 'n'])).toBe(true);
    expect(outcomeFor('lion', ['n', 'o', 'i', 'l'])).toBe('found');
  });

  it(`perd après ${MAX_MISTAKES} erreurs`, () => {
    const wrong = 'bcdefghj'.split('');
    expect(outcomeFor('lion', wrong.slice(0, MAX_MISTAKES - 1))).toBeNull();
    expect(outcomeFor('lion', wrong.slice(0, MAX_MISTAKES))).toBe('lost');
  });

  it('ignore une lettre déjà proposée, hors alphabet, ou une partie finie', () => {
    expect(guess('lion', ['l'], 'l')).toEqual({ kind: 'ignored' });
    expect(guess('lion', [], '7')).toEqual({ kind: 'ignored' });
    expect(guess('lion', ['l', 'i', 'o', 'n'], 'a')).toEqual({ kind: 'ignored' });
  });

  it('juste, fausse, puis issue', () => {
    expect(guess('lion', [], 'o')).toEqual({ kind: 'hit', guesses: ['o'], outcome: null });
    expect(guess('lion', ['o'], 'z')).toEqual({ kind: 'miss', guesses: ['o', 'z'], outcome: null });
    expect(guess('lion', ['o', 'l', 'i'], 'n')).toEqual({ kind: 'hit', guesses: ['o', 'l', 'i', 'n'], outcome: 'found' });
    expect(guess('zèbre', ['z', 'b', 'r'], 'é')).toMatchObject({ kind: 'hit', outcome: 'found' });
  });
});

describe('pendu — tirage', () => {
  it('évite les mots récents', () => {
    const recent = HANGMAN_WORDS.slice(0, 40).map((w) => w.id);
    for (let seed = 0; seed < 200; seed += 1) {
      expect(recent).not.toContain(drawWord(HANGMAN_WORDS, recent, createRng(seed)).id);
    }
  });

  it('retombe sur tout le catalogue quand tout a été vu récemment', () => {
    const words = HANGMAN_WORDS.slice(0, 3);
    const recent = words.map((w) => w.id);
    const drawn = drawWord(words, recent, createRng(1));
    expect(words).toContain(drawn);
    // Seuls les 2 derniers vus sont exclus : le plus ancien redevient possible.
    expect(drawn.id).toBe(words[0]!.id);
  });
});
