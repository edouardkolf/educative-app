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
    const correctItem = round!.data.choices.find((c) => c.id === round!.answer)!.item;
    const correct = (correctItem as { kind: 'token'; token: Token }).token;
    const full: Token[] = [...round!.data.items].map((it, i) =>
      i === round!.data.blankIndex ? correct : ((it as { kind: 'token'; token: Token }).token as Token),
    );

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
    const correctItem = round!.data.choices.find((c) => c.id === round!.answer)!.item;
    const correct = (correctItem as { kind: 'token'; token: Token }).token;
    const full: Token[] = [...round!.data.items].map((it, i) =>
      i === round!.data.blankIndex ? correct : ((it as { kind: 'token'; token: Token }).token as Token),
    );
    const firstThree = full.slice(0, 3); // "ABCABC" : A, B, C sur les 3 premières cases
    expect(new Set(firstThree.map((t) => t.color)).size).toBe(3);
    expect(new Set(firstThree.map((t) => t.shape)).size).toBe(3);
  });

  it('reste robuste (sans erreur) même avec un réservoir trop petit pour params.choices', () => {
    const params = seqParams({ pattern: 'AA', colors: ['red'], shapes: ['circle'], length: 4, choices: 2 });
    expect(() => generateRounds(params, 5, createRng(1))).not.toThrow();
  });

  it('vary "object" : un objet distinct par lettre du motif', () => {
    const params = seqParams({
      pattern: 'AAB',
      vary: 'object',
      colors: undefined,
      shapes: undefined,
      objects: ['dog', 'cat', 'rabbit', 'fish'],
      length: 7,
      choices: 3,
    });
    const [round] = generateRounds(params, 1, createRng(5));
    const correctItem = round!.data.choices.find((c) => c.id === round!.answer)!.item;
    const full = [...round!.data.items].map((it, i) => (i === round!.data.blankIndex ? correctItem : it)) as {
      kind: 'object';
      objectId: string;
    }[];

    for (let i = 0; i < full.length; i += 1) {
      for (let j = i + 1; j < full.length; j += 1) {
        const sameLetter = params.pattern[i % params.pattern.length] === params.pattern[j % params.pattern.length];
        if (sameLetter) expect(full[i]!.objectId).toBe(full[j]!.objectId);
        else expect(full[i]!.objectId).not.toBe(full[j]!.objectId);
      }
    }
  });

  it('vary "object" : la réponse fait partie des propositions, et les ids sont uniques', () => {
    const params = seqParams({
      pattern: 'AB',
      vary: 'object',
      colors: undefined,
      shapes: undefined,
      objects: ['sunflower', 'tulip', 'cactus', 'tree', 'fir', 'clover'],
      length: 6,
      choices: 4,
    });
    for (const round of generateRounds(params, 10, createRng(9))) {
      const ids = round.data.choices.map((c) => c.id);
      expect(ids).toContain(round.answer);
      expect(new Set(ids).size).toBe(ids.length);
      expect(round.data.choices).toHaveLength(4);
      for (const { item } of round.data.choices) expect(item.kind).toBe('object');
    }
  });

  it('vary "object" : respecte le motif AB sur toute la longueur', () => {
    const params = seqParams({
      pattern: 'AB',
      vary: 'object',
      colors: undefined,
      shapes: undefined,
      objects: ['dog', 'cat'],
      length: 6,
      choices: 2,
    });
    for (const round of generateRounds(params, 5, createRng(2))) {
      const correctItem = round.data.choices.find((c) => c.id === round.answer)!.item as {
        kind: 'object';
        objectId: string;
      };
      const full = round.data.items.map((it, i) => (i === round.data.blankIndex ? correctItem : it)) as {
        kind: 'object';
        objectId: string;
      }[];
      expect(full[0]!.objectId).toBe(full[2]!.objectId);
      expect(full[0]!.objectId).toBe(full[4]!.objectId);
      expect(full[1]!.objectId).toBe(full[3]!.objectId);
      expect(full[1]!.objectId).toBe(full[5]!.objectId);
      expect(full[0]!.objectId).not.toBe(full[1]!.objectId);
    }
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
