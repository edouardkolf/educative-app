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
const tracks: Track[] = Object.values(trackModules);

const levelsById = new Map(levels.map((level) => [level.id, level]));
const tracksById = new Map(tracks.map((track) => [track.id, track]));

export function getTracks(): Track[] {
  return tracks.slice();
}

export function getTrack(trackId: string): Track | undefined {
  return tracksById.get(trackId);
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
