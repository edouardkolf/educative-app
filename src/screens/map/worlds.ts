// Mondes de la carte : identité visuelle (panneau, particules) et détection d'une arrivée dans un nouveau monde.
import type { LevelState } from '../../engine/types';
import { worldIndexForLevel, type WorldId } from './layout';

export interface WorldMeta {
  /** Icône du panneau d'entrée (l'enfant ne lit pas encore : pas de texte). */
  icon: string;
  /** Nom lisible, pour les lecteurs d'écran. */
  label: string;
  /** Particules de la fête d'arrivée. */
  particles: readonly string[];
}

export const WORLD_META: Record<WorldId, WorldMeta> = {
  forest: { icon: '🌳', label: 'la forêt', particles: ['🍃', '🌼', '🍂'] },
  sea: { icon: '🐠', label: 'la mer', particles: ['🐟', '🐚', '💧'] },
  mountain: { icon: '🏔️', label: 'la montagne', particles: ['❄️', '⭐', '🌸'] },
};

/** Monde atteint : celui du niveau en cours, sinon du dernier niveau réussi, sinon le premier. */
export function reachedWorldIndex(states: readonly LevelState[]): number {
  let index = states.findIndex((s) => s.current);
  if (index === -1) {
    for (let i = states.length - 1; i >= 0; i -= 1) {
      if (states[i]?.status === 'completed') {
        index = i;
        break;
      }
    }
  }
  return index === -1 ? 0 : worldIndexForLevel(index);
}

export interface WorldEntry {
  worldIndex: number;
  /** Niveau de départ du trajet de l'avatar (null : pas de trajet, fête seule). */
  fromIndex: number | null;
  /** Niveau d'arrivée : le niveau en cours. */
  toIndex: number;
}

/**
 * Faut-il fêter l'arrivée dans un monde ? Oui seulement si le monde atteint dépasse le dernier
 * monde vu et qu'un niveau en cours s'y trouve. `seenWorld` absent : rien à fêter (premier calibrage).
 */
export function pendingWorldEntry(states: readonly LevelState[], seenWorld: number | undefined): WorldEntry | null {
  if (seenWorld === undefined) return null;
  const worldIndex = reachedWorldIndex(states);
  if (worldIndex <= seenWorld) return null;
  const toIndex = states.findIndex((s) => s.current);
  if (toIndex === -1 || worldIndexForLevel(toIndex) !== worldIndex) return null;
  return { worldIndex, fromIndex: toIndex > 0 ? toIndex - 1 : null, toIndex };
}
