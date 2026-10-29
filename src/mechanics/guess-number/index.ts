// SOUCHE (T0) — mécanique « guess-number », écrite par sa tâche (docs/specs/JEUX-LOGIQUE.md §3, contrat §2).
// Remplacer generateRounds et View ; garder le nom d'export `guessNumber` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const guessNumber: MechanicDefinition<'guess-number', unknown> = {
  id: 'guess-number',
  generateRounds() {
    throw new Error('mécanique guess-number : pas encore implémentée');
  },
  View: () => null,
};
