// SOUCHE (M0) — mécanique « order », écrite par sa tâche (docs/specs/JEUX-MATERNELLE.md §3 ; contrat :
// docs/specs/JEUX-LOGIQUE.md §2). Remplacer generateRounds et View ; garder le nom d'export `order` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const order: MechanicDefinition<'order', unknown> = {
  id: 'order',
  generateRounds() {
    throw new Error('mécanique order : pas encore implémentée');
  },
  View: () => null,
};
