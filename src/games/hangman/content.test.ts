// Contenu du pendu, vérifié au build (`validate:content`) : un mot invalide casse le build, comme un niveau.
import { describe, expect, it } from 'vitest';
import { baseLetter } from './logic';
import { HANGMAN_WORDS } from './words';

const ALLOWED = /^[a-zàâäçéèêëîïôöùûüœ]+$/;

describe('catalogue du pendu', () => {
  it('contient au moins 100 mots', () => {
    expect(HANGMAN_WORDS.length).toBeGreaterThanOrEqual(100);
  });

  it('ids et mots uniques ; id = le mot sans accent', () => {
    const ids = new Set(HANGMAN_WORDS.map((w) => w.id));
    const words = new Set(HANGMAN_WORDS.map((w) => w.word));
    expect(ids.size).toBe(HANGMAN_WORDS.length);
    expect(words.size).toBe(HANGMAN_WORDS.length);
    for (const w of HANGMAN_WORDS) {
      expect(Array.from(w.word).map(baseLetter).join(''), w.word).toBe(w.id);
    }
  });

  it('mots en minuscules, sans espace ni tiret, de 3 à 10 lettres', () => {
    for (const w of HANGMAN_WORDS) {
      expect(w.word, w.word).toMatch(ALLOWED);
      expect(w.word.length, w.word).toBeGreaterThanOrEqual(3);
      expect(w.word.length, w.word).toBeLessThanOrEqual(10);
      expect(w.word, w.word).not.toMatch(/œ/); // « œ » n'a pas de touche : il ne se devinerait pas
    }
  });

  it("chaque indice est court et ne donne pas le mot", () => {
    for (const w of HANGMAN_WORDS) {
      const hint = w.hint.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      expect(hint.length, w.word).toBeGreaterThan(5);
      expect(w.hint.length, w.word).toBeLessThanOrEqual(60);
      expect(new RegExp(`\\b${w.id}`).test(hint), `${w.word} : ${w.hint}`).toBe(false);
    }
  });
});
