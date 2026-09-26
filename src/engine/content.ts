// Contenu pédagogique : intégré au build via import.meta.glob (disponible hors ligne, pas de fetch).
import type { Level, Track } from './types';

const levelModules = import.meta.glob('/content/levels/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Level>;

const trackModules = import.meta.glob('/content/tracks/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Track>;

const levels: Level[] = Object.values(levelModules);
// Ordre scolaire : le premier parcours sert de défaut (nouvel enfant, parcours inconnu). Parcours hors liste : à la fin.
const SCHOOL_ORDER = ['ps', 'ms', 'gs', 'cp', 'ce1', 'ce2', 'cm1', 'cm2'];
const schoolRank = (id: string): number => {
  const rank = SCHOOL_ORDER.indexOf(id);
  return rank === -1 ? SCHOOL_ORDER.length : rank;
};
const tracks: Track[] = Object.values(trackModules).sort((a, b) => schoolRank(a.id) - schoolRank(b.id));

const levelsById = new Map(levels.map((level) => [level.id, level]));
const tracksById = new Map(tracks.map((track) => [track.id, track]));

export function getTracks(): Track[] {
  return tracks.slice();
}

export function getTrack(trackId: string): Track | undefined {
  return tracksById.get(trackId);
}

/**
 * F11 : un parcours inconnu (`profile.trackId` d'une sauvegarde importée dont le contenu a changé)
 * n'est jamais rejeté à l'import — à l'affichage, on se replie sur le premier parcours disponible
 * plutôt que de planter ou de montrer un écran vide.
 */
export function getTrackOrDefault(trackId: string): Track | undefined {
  return getTrack(trackId) ?? getTracks()[0];
}

export function getLevel(levelId: string): Level | undefined {
  return levelsById.get(levelId);
}

/** Niveau suivant dans le parcours, ou undefined si c'est le dernier. */
export function getNextLevelId(track: Track, levelId: string): string | undefined {
  const index = track.levels.indexOf(levelId);
  if (index === -1) return undefined;
  return track.levels[index + 1];
}
