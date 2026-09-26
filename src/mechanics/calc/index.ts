// Mécanique « calcul » : additions, soustractions, tables de multiplication (niveau CE1).
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { CalcView } from './CalcView';
import type { CalcRoundData } from './types';

export const calc: MechanicDefinition<'calc', CalcRoundData> = {
  id: 'calc',
  generateRounds,
  View: CalcView,
  tutorialTargets(round) {
    if (round.data.answerMode === 'keypad') {
      return [...round.answer].map((digit) => `key-${digit}`).concat('key-ok');
    }
    return [round.answer];
  },
};

export type { CalcRoundData } from './types';
export { validateParams } from './validate';
