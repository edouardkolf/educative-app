// Mécanique « Lis et montre » (CE1) : génère les manches et les affiche.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { ReadView } from './ReadView';
import type { ReadRoundData } from './types';

export const read: MechanicDefinition<'read', ReadRoundData> = {
  id: 'read',
  generateRounds,
  View: ReadView,
};

export type { ReadRoundData } from './types';
