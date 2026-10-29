// SOUCHE (T0) — mécanique « robot », écrite par sa tâche (docs/specs/JEUX-LOGIQUE.md §3, contrat §2).
// Remplacer generateRounds et View ; garder le nom d'export `robot` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const robot: MechanicDefinition<'robot', unknown> = {
  id: 'robot',
  generateRounds() {
    throw new Error('mécanique robot : pas encore implémentée');
  },
  View: () => null,
};
