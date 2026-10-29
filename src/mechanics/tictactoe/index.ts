// SOUCHE (T0) — mécanique « tictactoe », écrite par sa tâche (docs/specs/JEUX-LOGIQUE.md §3, contrat §2).
// Remplacer generateRounds et View ; garder le nom d'export `tictactoe` et l'id.
import type { MechanicDefinition } from '../../engine/types';

export const tictactoe: MechanicDefinition<'tictactoe', unknown> = {
  id: 'tictactoe',
  generateRounds() {
    throw new Error('mécanique tictactoe : pas encore implémentée');
  },
  View: () => null,
};
