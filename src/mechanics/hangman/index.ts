// SOUCHE (T0) — mécanique « hangman », écrite par sa tâche (docs/specs/JEUX-LOGIQUE.md §3, contrat §2).
// Remplacer generateRounds et View ; garder le nom d'export `hangman` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const hangman: MechanicDefinition<'hangman', unknown> = {
  id: 'hangman',
  generateRounds() {
    throw new Error('mécanique hangman : pas encore implémentée');
  },
  View: () => null,
};
