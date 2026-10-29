import { describe, expect, it } from 'vitest';
import { scoreGuess, shouldEmitMiss } from './logic';

const s = (code: string, guess: string) => scoreGuess(code.split(''), guess.split(''));

describe('scoreGuess', () => {
  it('code trouvé', () => {
    const r = s('abc', 'abc');
    expect(r).toMatchObject({ exact: 3, present: 0, marks: ['exact', 'exact', 'exact'] });
  });
  it('rien en commun', () => {
    expect(s('abc', 'def')).toMatchObject({ exact: 0, present: 0, marks: ['absent', 'absent', 'absent'] });
  });
  it('couleurs présentes mal placées', () => {
    expect(s('abc', 'bca')).toMatchObject({ exact: 0, present: 3 });
  });
  it('mélange', () => {
    expect(s('abcd', 'abdx').marks).toEqual(['exact', 'exact', 'present', 'absent']);
  });
  it('doublon dans l\'essai, une seule dans le code : une seule marque', () => {
    expect(s('abc', 'aad').marks).toEqual(['exact', 'absent', 'absent']);
    expect(s('abc', 'daa').marks).toEqual(['absent', 'present', 'absent']);
  });
  it('un bien placé consomme la couleur avant les présents', () => {
    expect(s('aabc', 'baaa').marks).toEqual(['present', 'exact', 'present', 'absent']);
  });
  it('doublon dans le code', () => {
    expect(s('aab', 'aaa').marks).toEqual(['exact', 'exact', 'absent']);
    expect(s('aab', 'baa')).toMatchObject({ exact: 1, present: 2 });
  });
  it('totaux cohérents avec les marques', () => {
    const r = s('abca', 'acaa');
    expect(r.exact + r.present).toBe(r.marks.filter((m) => m !== 'absent').length);
    expect(r).toMatchObject({ exact: 2, present: 1 });
  });
});

describe('shouldEmitMiss', () => {
  it('émet une fois quand le budget est épuisé', () => {
    expect(shouldEmitMiss(2, 3, false, false)).toBe(false);
    expect(shouldEmitMiss(3, 3, false, false)).toBe(true);
    expect(shouldEmitMiss(4, 3, false, true)).toBe(false);
  });
  it('jamais si le code est trouvé', () => {
    expect(shouldEmitMiss(3, 3, true, false)).toBe(false);
  });
});
