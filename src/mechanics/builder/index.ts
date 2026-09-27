// Mécanique « builder » (le constructeur) : génère les manches et les affiche.
import type { MechanicDefinition } from '../../engine/types';
import { BuilderView } from './BuilderView';
import { generateRounds } from './generate';
import { shapesMatch } from './snap';
import type { BuilderRoundData } from './types';

export const builder: MechanicDefinition<'builder', BuilderRoundData> = {
  id: 'builder',
  generateRounds,
  View: BuilderView,
  // Fin de figure (BuilderView) : l'objet devient vrai à 0,45 s, vit jusqu'à 2,25 s, puis part
  // (décolle, prend le large…) en 1,1 s (builder.css).
  solvedDelayMs: 3400,
  // La main du tutoriel mime une seule paire : une pièce qui correspond, puis son emplacement.
  tutorialTargets: (round) => {
    const { slots, pieces } = round.data;
    const slot = slots[0];
    if (!slot) return ['done'];
    const piece = pieces.find((p) => shapesMatch(p, slot));
    return piece ? [piece.id, slot.id] : ['done'];
  },
};

export type { BuilderRoundData } from './types';
