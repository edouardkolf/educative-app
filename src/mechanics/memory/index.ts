// Mécanique « memory » : retrouver toutes les paires, seule (docs/specs/JEUX-MATERNELLE.md §3.1).
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { MemoryView } from './MemoryView';
import type { MemoryRoundData } from './types';

export const memory: MechanicDefinition<'memory', MemoryRoundData> = {
  id: 'memory',
  generateRounds,
  View: MemoryView,
  solvedDelayMs: 1200,
  tutorialTargets(round) {
    const first = round.data.cards[0];
    return round.data.cards.flatMap((id, i) => (id === first ? [`card-${i}`] : []));
  },
};

export type { MemoryRoundData } from './types';
export { validateMemory } from './validate';
