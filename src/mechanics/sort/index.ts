// Mécanique « sort » (le trieur magique) : génère les manches et les affiche.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { SortView } from './SortView';
import type { SortRoundData } from './types';

export const sort: MechanicDefinition<'sort', SortRoundData> = {
  id: 'sort',
  generateRounds,
  View: SortView,
  // L'objet rétrécit et saute dans le panier (~480 ms, voir SortView) avant d'enchaîner.
  solvedDelayMs: 800,
};

export type { SortRoundData } from './types';
