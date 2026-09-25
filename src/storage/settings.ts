// Réglages de l'app : code parent (haché), son, session en cours, écran de fin, persistance.
import { getDB } from './db';
import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  pinHash: null,
  pinSalt: null,
  soundOn: true,
  session: null,
  lock: null,
};

/** Demande au navigateur de ne jamais effacer nos données. `false` si indisponible, jamais d'exception. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined') return false;
    return (await navigator.storage?.persist?.()) === true;
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined') return false;
    return (await navigator.storage?.persisted?.()) === true;
  } catch {
    return false;
  }
}

/** Renvoie les réglages, avec des valeurs par défaut si rien n'est encore enregistré. */
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const existing = await db.get('settings', 'app');
  return existing ?? { ...DEFAULT_SETTINGS };
}

/** Fusionne `patch` dans les réglages existants (fusion superficielle). */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  const existing = (await tx.store.get('app')) ?? { ...DEFAULT_SETTINGS };
  const updated: AppSettings = { ...existing, ...patch };
  await tx.store.put(updated, 'app');
  await tx.done;
  return updated;
}
