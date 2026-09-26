// Mécanique « comparer » (CE1) : deux cartes, trois boutons < = >, gauche ? droite.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { CompareView } from './CompareView';
import type { CompareRoundData } from './types';

export const compare: MechanicDefinition<'compare', CompareRoundData> = {
  id: 'compare',
  generateRounds,
  View: CompareView,
};

export type { CompareRoundData, Side } from './types';
