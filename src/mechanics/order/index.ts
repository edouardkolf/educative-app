// Mécanique « ranger du plus petit au plus grand » (moyenne section), sans texte.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { OrderView } from './OrderView';
import type { OrderRoundData } from './types';

export const order: MechanicDefinition<'order', OrderRoundData> = {
  id: 'order',
  generateRounds,
  View: OrderView,
  solvedDelayMs: 1100,
  tutorialTargets: (round) => round.answer.split('-').map((id) => `item-${id}`),
};

export type { OrderRoundData, OrderItem } from './types';
export { validateOrder } from './validate';
