import { describe, expect, it } from 'vitest';
import { applyGuess, createGuessState } from './logic';

const start = () => createGuessState(42, 1, 100, 3);

describe('applyGuess', () => {
  it('donne plus grand / plus petit et resserre les bornes', () => {
    let r = applyGuess(start(), 30);
    expect(r.hint).toBe('higher');
    expect([r.state.low, r.state.high]).toEqual([31, 100]);
    r = applyGuess(r.state, 60);
    expect(r.hint).toBe('lower');
    expect([r.state.low, r.state.high]).toEqual([31, 59]);
  });

  it("n'élargit jamais les bornes avec une proposition hors zone", () => {
    let r = applyGuess(start(), 30);
    r = applyGuess(r.state, 10);
    expect(r.hint).toBe('higher');
    expect(r.state.low).toBe(31);
    r = applyGuess(r.state, 90);
    r = applyGuess(r.state, 99);
    expect(r.state.high).toBe(89);
    expect(r.state.guesses).toEqual([30, 10, 90, 99]);
  });

  it('trouve le nombre', () => {
    const r = applyGuess(start(), 42);
    expect(r.hint).toBe('found');
    expect(r.state.found).toBe(true);
    expect(r.justMissed).toBe(false);
  });

  it('rate dès que le budget est dépassé, une seule fois', () => {
    let s = start();
    for (const n of [1, 2, 3]) {
      const r = applyGuess(s, n);
      expect(r.justMissed).toBe(false);
      s = r.state;
    }
    expect(s.missed).toBe(false);
    let r = applyGuess(s, 4);
    expect(r.justMissed).toBe(true);
    expect(r.state.missed).toBe(true);
    r = applyGuess(r.state, 5);
    expect(r.justMissed).toBe(false);
    expect(r.state.missed).toBe(true);
  });

  it('trouver juste à la dernière proposition permise ou juste après ne rate pas', () => {
    let s = start();
    for (const n of [1, 2]) s = applyGuess(s, n).state;
    expect(applyGuess(s, 42).state.missed).toBe(false);
    s = applyGuess(s, 3).state;
    const r = applyGuess(s, 42);
    expect(r.justMissed).toBe(false);
    expect(r.state.missed).toBe(false);
  });

  it('ignore une proposition après la réussite', () => {
    const found = applyGuess(start(), 42).state;
    expect(applyGuess(found, 7).state).toBe(found);
  });
});
