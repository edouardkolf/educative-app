// Génération pure des manches de « builder » (le constructeur). Aucun DOM, aucun stockage.
import { COLORS, type BuilderParams, type Color, type FigureId, type Rng, type Round } from '../../engine/types';
import { getFigure } from './figures';
import { shapesMatch, type PieceShape } from './snap';
import type { BuilderPieceData, BuilderRoundData, BuilderSlotData } from './types';

/** Pioche sans répétition dans `figures` tant que le réservoir n'est pas épuisé, puis remélange. */
function makeFigurePicker(figures: readonly FigureId[], rng: Rng): () => FigureId {
  let queue: FigureId[] = [];
  return () => {
    if (queue.length === 0) queue = rng.shuffle(figures);
    return queue.shift() as FigureId;
  };
}

/**
 * Une pièce distracteur qui ne correspond (forme + taille) à AUCUN emplacement de `slots` : part
 * d'un emplacement au hasard puis rétrécit jusqu'à être sans ambiguïté différente de tous les
 * emplacements de même forme.
 */
function makeDistractor(rng: Rng, slots: readonly PieceShape[], id: string): BuilderPieceData {
  const base = rng.pick(slots);
  let w = base.w;
  let h = base.h;
  let guard = 0;
  do {
    w *= 0.6;
    h *= 0.6;
    guard += 1;
  } while (slots.some((s) => shapesMatch({ shape: base.shape, w, h }, s, 3)) && guard < 10);
  const color = rng.pick(COLORS) as Color;
  return { id, shape: base.shape, w, h, color };
}

export function generateRounds(params: BuilderParams, count: number, rng: Rng): Round<BuilderRoundData>[] {
  const pickFigure = makeFigurePicker(params.figures, rng);
  const distractors = Math.min(2, Math.max(0, params.distractors));

  const rounds: Round<BuilderRoundData>[] = [];
  for (let i = 0; i < count; i += 1) {
    const figureId = pickFigure();
    const figure = getFigure(figureId);

    const slots: BuilderSlotData[] = figure.slots.map((slot, index) => ({ id: `slot-${index}`, ...slot }));

    const matchingPieces: BuilderPieceData[] = figure.slots.map((slot, index) => ({
      id: `piece-match-${index}`,
      shape: slot.shape,
      w: slot.w,
      h: slot.h,
      color: slot.color,
    }));
    const extraPieces: BuilderPieceData[] = Array.from({ length: distractors }, (_, index) =>
      makeDistractor(rng, figure.slots, `piece-extra-${index}`),
    );
    const pieces = rng.shuffle([...matchingPieces, ...extraPieces]).map((piece, index) => ({
      ...piece,
      id: `piece-${index}`,
    }));

    rounds.push({ data: { figureId, endAnimation: figure.endAnimation, slots, pieces }, answer: 'done' });
  }
  return rounds;
}
