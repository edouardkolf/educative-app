// Réglages de l'app : code parent (haché), son, session en cours, écran de fin, persistance.
import { getDB } from './db';
import { dayKey } from './day';
import type { AppSettings, LockState } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  pinHash: null,
  pinSalt: null,
  soundOn: true,
  sessions: {},
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

/**
 * Un verrou posé un autre jour que `now` est périmé : le quota du jour repart de 0 à minuit et la
 * session de la veille n'est plus reprise (inactivité > 10 min), donc il n'y a plus rien à verrouiller.
 */
export function isLockStale(lock: LockState | null, now: number): boolean {
  return lock !== null && dayKey(new Date(lock.lockedAt)) !== dayKey(new Date(now));
}

/**
 * Renvoie les réglages, avec des valeurs par défaut si rien n'est encore enregistré.
 * Un verrou de la veille (ou plus ancien) est levé ici, une fois pour toutes, pour que tous les
 * écrans (garde de route, écran de fin, minuteur) voient le même état : sans ça, l'enfant retombait
 * le lendemain sur l'écran de fin sans avoir joué, tant qu'aucun adulte n'avait déverrouillé.
 */
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const existing = await db.get('settings', 'app');
  if (!existing) return { ...DEFAULT_SETTINGS };
  if (!isLockStale(existing.lock, Date.now())) return existing;

  // Relecture dans la transaction : on ne lève le verrou que s'il est toujours périmé (un verrou
  // posé entre-temps par le minuteur ne doit pas être effacé).
  const tx = db.transaction('settings', 'readwrite');
  const current = (await tx.store.get('app')) ?? { ...DEFAULT_SETTINGS };
  let result = current;
  if (isLockStale(current.lock, Date.now())) {
    result = { ...current, lock: null };
    await tx.store.put(result, 'app');
  }
  await tx.done;
  return result;
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
