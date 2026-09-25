// Mécanique « compter des objets et taper le bon nombre » : génère les manches et les affiche.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { CountView } from './CountView';
import type { CountRoundData } from './types';

export const count: MechanicDefinition<'count', CountRoundData> = {
  id: 'count',
  generateRounds,
  View: CountView,
};

export type { CountRoundData } from './types';
