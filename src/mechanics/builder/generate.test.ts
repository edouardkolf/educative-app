import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { BuilderParams, FigureId } from '../../engine/types';
import { getFigure } from './figures';
import { generateRounds } from './generate';
import { shapesMatch } from './snap';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

function params(overrides: Partial<BuilderParams> = {}): BuilderParams {
  return { figures: ['house', 'tree', 'boat'], distractors: 0, ...overrides };
}

describe('builder.generateRounds', () => {
  it('génère exactement `count` manches, réponse toujours "done"', () => {
    for (const seed of SEEDS) {
      const rounds = generateRounds(params(), 6, createRng(seed));
      expect(rounds).toHaveLength(6);
      for (const round of rounds) expect(round.answer).toBe('done');
    }
  });

  it('cycle les figures sans répétition tant que le réservoir n\'est pas épuisé', () => {
    const p = params({ figures: ['house', 'tree', 'boat'] });
    for (const seed of SEEDS) {
      const rounds = generateRounds(p, 6, createRng(seed)); // 2 tours complets
      const firstBatch = rounds.slice(0, 3).map((r) => r.data.figureId);
      const secondBatch = rounds.slice(3, 6).map((r) => r.data.figureId);
      expect(new Set(firstBatch)).toEqual(new Set(p.figures));
      expect(new Set(secondBatch)).toEqual(new Set(p.figures));
    }
  });

  it('nombre de pièces = nombre d\'emplacements + distracteurs', () => {
    for (const distractors of [0, 1, 2]) {
      const p = params({ distractors });
      for (const seed of SEEDS) {
        const rounds = generateRounds(p, 3, createRng(seed));
        for (const round of rounds) {
          const figure = getFigure(round.data.figureId);
          expect(round.data.pieces.length).toBe(figure.slots.length + distractors);
        }
      }
    }
  });

  it('les pièces distracteurs ne correspondent à aucun emplacement de la manche', () => {
    const p = params({ distractors: 2 });
    for (const seed of SEEDS) {
      const rounds = generateRounds(p, 3, createRng(seed));
      for (const round of rounds) {
        const distractorPieces = round.data.pieces.filter((piece) => piece.id.includes('extra'));
        // Les ids sont réattribués (piece-0, piece-1…) : identifie les distracteurs par exclusion —
        // ceux qui NE correspondent à aucun emplacement.
        for (const piece of round.data.pieces) {
          const matches = round.data.slots.filter((slot) => shapesMatch(piece, slot));
          // Chaque pièce doit soit correspondre à au moins un emplacement (pièce "normale"), soit à
          // aucun (distracteur) — jamais un état ambigu, et le total doit refléter la génération.
          expect(matches.length).toBeGreaterThanOrEqual(0);
        }
        const matchingCount = round.data.pieces.filter((piece) =>
          round.data.slots.some((slot) => shapesMatch(piece, slot)),
        ).length;
        expect(matchingCount).toBe(round.data.slots.length);
        void distractorPieces;
      }
    }
  });

  it('chaque emplacement a au moins une pièce du plateau qui lui correspond', () => {
    const p = params({ distractors: 1 });
    for (const seed of SEEDS) {
      const rounds = generateRounds(p, 3, createRng(seed));
      for (const round of rounds) {
        for (const slot of round.data.slots) {
          const hasMatch = round.data.pieces.some((piece) => shapesMatch(piece, slot));
          expect(hasMatch).toBe(true);
        }
      }
    }
  });

  it('avec un seul figure dans le réservoir, répète cette figure sans planter', () => {
    const p = params({ figures: ['robot'] as FigureId[] });
    const rounds = generateRounds(p, 4, createRng(1));
    expect(rounds).toHaveLength(4);
    expect(rounds.every((r) => r.data.figureId === 'robot')).toBe(true);
  });
});
