// SOUCHE (M0) — mécanique « memory », écrite par sa tâche (docs/specs/JEUX-MATERNELLE.md §3 ; contrat :
// docs/specs/JEUX-LOGIQUE.md §2). Remplacer generateRounds et View ; garder le nom d'export `memory` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const memory: MechanicDefinition<'memory', unknown> = {
  id: 'memory',
  generateRounds() {
    throw new Error('mécanique memory : pas encore implémentée');
  },
  View: () => null,
};
