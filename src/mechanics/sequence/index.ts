// Mécanique « compléter une suite » : génère les manches et les affiche.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { SequenceView } from './SequenceView';
import type { SequenceRoundData } from './types';

export const sequence: MechanicDefinition<'sequence', SequenceRoundData> = {
  id: 'sequence',
  generateRounds,
  View: SequenceView,
};

export type { SequenceRoundData } from './types';
