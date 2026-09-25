// Profils enfants : CRUD + suppression en cascade.
import { getDB } from './db';
import type { Profile } from './types';

export async function listProfiles(): Promise<Profile[]> {
  const db = await getDB();
  return db.getAll('profiles');
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  const db = await getDB();
  return db.get('profiles', id);
}

/** Crée (id absent) ou met à jour un profil. Renvoie le profil enregistré. */
export async function saveProfile(
  profile: Omit<Profile, 'id' | 'createdAt'> & Partial<Pick<Profile, 'id' | 'createdAt'>>,
): Promise<Profile> {
  const db = await getDB();
  const existing = profile.id ? await db.get('profiles', profile.id) : undefined;
  const record: Profile = {
    ...profile,
    id: existing?.id ?? profile.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? profile.createdAt ?? Date.now(),
  };
  await db.put('profiles', record);
  return record;
}

/**
 * Supprime le profil ET toutes ses données (parties, réglages de niveaux, temps de jeu),
 * et remet `settings.session` / `settings.lock` à null s'ils concernaient ce profil.
 * Tout se fait dans une seule transaction.
 */
export async function deleteProfile(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['profiles', 'runs', 'overrides', 'usage', 'settings'], 'readwrite');
  const profiles = tx.objectStore('profiles');
  const runs = tx.objectStore('runs');
  const overrides = tx.objectStore('overrides');
  const usage = tx.objectStore('usage');
  const settings = tx.objectStore('settings');

  await profiles.delete(id);

  const runKeys = await runs.index('profileId').getAllKeys(id);
  await Promise.all(runKeys.map((key) => runs.delete(key)));

  const overrideKeys = await overrides.index('profileId').getAllKeys(id);
  await Promise.all(overrideKeys.map((key) => overrides.delete(key)));

  const usageKeys = await usage.index('profileId').getAllKeys(id);
  await Promise.all(usageKeys.map((key) => usage.delete(key)));

  const currentSettings = await settings.get('app');
  if (currentSettings) {
    const next = { ...currentSettings };
    let changed = false;
    if (next.session?.profileId === id) {
      next.session = null;
      changed = true;
    }
    if (next.lock?.profileId === id) {
      next.lock = null;
      changed = true;
    }
    if (changed) {
      await settings.put(next, 'app');
    }
  }

  await tx.done;
}
