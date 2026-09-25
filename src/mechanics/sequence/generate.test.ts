import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { SequenceParams, Token } from '../../engine/types';
import { generateRounds, tokenId } from './generate';

function seqParams(overrides: Partial<SequenceParams> = {}): SequenceParams {
  return {
    pattern: 'AB',
    vary: 'color',
    colors: ['red', 'blue', 'yellow'],
    shapes: ['circle'],
    length: 5,
    blank: 'end',
    choices: 2,
    ...overrides,
  };
}

describe('sequence.generateRounds', () => {
  it('respecte le motif : même lettre → même jeton, lettres différentes → jetons différents', () => {
    const params = seqParams({
      pattern: 'AAB',
      colors: ['red', 'blue', 'yellow'],
      shapes: ['circle'],
      length: 7,
      choices: 3,
    });
    const [round] = generateRounds(params, 1, createRng(1));
    const correct = round!.data.choices.find((c) => c.id === round!.answer)!.token;
    const full: Token[] = [...round!.data.items].map((t, i) => (i === round!.data.blankIndex ? correct : (t as Token)));

    for (let i = 0; i < full.length; i += 1) {
      for (let j = i + 1; j < full.length; j += 1) {
        const sameLetter = params.pattern[i % params.pattern.length] === params.pattern[j % params.pattern.length];
        if (sameLetter) expect(tokenId(full[i] as Token)).toBe(tokenId(full[j] as Token));
        else expect(tokenId(full[i] as Token)).not.toBe(tokenId(full[j] as Token));
      }
    }
  });

  it('la réponse fait partie des propositions', () => {
    const params = seqParams();
    for (const round of generateRounds(params, 8, createRng(3))) {
      expect(round.data.choices.map((c) => c.id)).toContain(round.answer);
    }
  });

  it('les ids des propositions sont uniques', () => {
    const params = seqParams({ colors: ['red', 'blue', 'yellow', 'green'], choices: 4 });
    for (const round of generateRounds(params, 8, createRng(6))) {
      const ids = round.data.choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('le nombre de propositions correspond à params.choices', () => {
    const params = seqParams({ colors: ['red', 'blue', 'yellow', 'green'], choices: 3 });
    for (const round of generateRounds(params, 5, createRng(2))) {
      expect(round.data.choices).toHaveLength(3);
    }
  });

  it('la case vide est la dernière case quand blank = "end"', () => {
    const params = seqParams({ blank: 'end', length: 6 });
    for (const round of generateRounds(params, 10, createRng(2))) {
      expect(round.data.blankIndex).toBe(5);
    }
  });

  it('la case vide est au milieu (après un motif complet, jamais en dernière case) quand blank = "middle"', () => {
    const params = seqParams({ pattern: 'AB', blank: 'middle', length: 8 });
    for (const round of generateRounds(params, 20, createRng(2))) {
      expect(round.data.blankIndex).toBeGreaterThanOrEqual(params.pattern.length);
      expect(round.data.blankIndex).toBeLessThanOrEqual(params.length - 2);
    }
  });

  it('déterminisme : même graine → mêmes manches', () => {
    const params = seqParams({ colors: ['red', 'blue', 'yellow', 'green'], choices: 3, length: 7 });
    const a = generateRounds(params, 6, createRng(77));
    const b = generateRounds(params, 6, createRng(77));
    expect(a).toEqual(b);
  });

  it('deux manches consécutives ne sont jamais identiques (réservoir suffisant)', () => {
    const params = seqParams({
      pattern: 'AB',
      colors: ['red', 'blue', 'yellow', 'green'],
      shapes: ['circle', 'square'],
      length: 5,
      choices: 3,
    });
    const rounds = generateRounds(params, 15, createRng(4));
    for (let i = 1; i < rounds.length; i += 1) {
      expect(rounds[i]).not.toEqual(rounds[i - 1]);
    }
  });

  it('vary "both" : couleurs et formes distinctes entre les lettres du motif', () => {
    const params = seqParams({
      pattern: 'ABC',
      vary: 'both',
      colors: ['red', 'blue', 'yellow', 'green'],
      shapes: ['circle', 'square', 'triangle', 'star'],
      length: 6,
      choices: 3,
    });
    const [round] = generateRounds(params, 1, createRng(11));
    const correct = round!.data.choices.find((c) => c.id === round!.answer)!.token;
    const full: Token[] = [...round!.data.items].map((t, i) => (i === round!.data.blankIndex ? correct : (t as Token)));
    const firstThree = full.slice(0, 3); // "ABCABC" : A, B, C sur les 3 premières cases
    expect(new Set(firstThree.map((t) => t.color)).size).toBe(3);
    expect(new Set(firstThree.map((t) => t.shape)).size).toBe(3);
  });

  it('reste robuste (sans erreur) même avec un réservoir trop petit pour params.choices', () => {
    const params = seqParams({ pattern: 'AA', colors: ['red'], shapes: ['circle'], length: 4, choices: 2 });
    expect(() => generateRounds(params, 5, createRng(1))).not.toThrow();
  });

  it('reste robuste (sans erreur) si le motif est plus long que ce que permet blank "middle"', () => {
    const params = seqParams({
      pattern: 'ABCDEF',
      vary: 'shape',
      shapes: ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'],
      colors: ['red'],
      length: 4,
      blank: 'middle',
      choices: 2,
    });
    expect(() => generateRounds(params, 3, createRng(1))).not.toThrow();
  });
});
