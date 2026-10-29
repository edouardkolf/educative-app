// SOUCHE (M0) — mécanique « maze », écrite par sa tâche (docs/specs/JEUX-MATERNELLE.md §3 ; contrat :
// docs/specs/JEUX-LOGIQUE.md §2). Remplacer generateRounds et View ; garder le nom d'export `maze` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const maze: MechanicDefinition<'maze', unknown> = {
  id: 'maze',
  generateRounds() {
    throw new Error('mécanique maze : pas encore implémentée');
  },
  View: () => null,
};
