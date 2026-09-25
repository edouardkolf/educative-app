// Réglages manuels du parent : forcer un niveau débloqué ou verrouillé pour un enfant.
import { getDB } from './db';
import type { LevelOverride } from './types';

export async function listOverrides(profileId: string): Promise<LevelOverride[]> {
  const db = await getDB();
  return db.getAllFromIndex('overrides', 'profileId', profileId);
}

/** state null = supprimer le réglage (retour à la règle normale). */
export async function setOverride(
  profileId: string,
  levelId: string,
  state: LevelOverride['state'] | null,
): Promise<void> {
  const db = await getDB();
  if (state === null) {
    await db.delete('overrides', [profileId, levelId]);
    return;
  }
  await db.put('overrides', { profileId, levelId, state });
}
