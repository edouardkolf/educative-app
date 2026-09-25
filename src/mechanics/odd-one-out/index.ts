// Mécanique « trouver l'intrus » : génère les manches et les affiche.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { OddOneOutView } from './OddOneOutView';
import type { OddOneOutRoundData } from './types';

export const oddOneOut: MechanicDefinition<'odd-one-out', OddOneOutRoundData> = {
  id: 'odd-one-out',
  generateRounds,
  View: OddOneOutView,
};

export type { OddOneOutRoundData } from './types';
