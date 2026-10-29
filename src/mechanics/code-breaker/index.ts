// SOUCHE (T0) — mécanique « code-breaker », écrite par sa tâche (docs/specs/JEUX-LOGIQUE.md §3, contrat §2).
// Remplacer generateRounds et View ; garder le nom d'export `codeBreaker` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const codeBreaker: MechanicDefinition<'code-breaker', unknown> = {
  id: 'code-breaker',
  generateRounds() {
    throw new Error('mécanique code-breaker : pas encore implémentée');
  },
  View: () => null,
};
