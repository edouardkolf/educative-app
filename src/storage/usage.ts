// Temps de jeu quotidien par enfant : secondes actives et minutes bonus accordées.
import { getDB } from './db';
import type { UsageDay } from './types';

const emptyUsage = (profileId: string, day: string): UsageDay => ({
  profileId,
  day,
  activeSeconds: 0,
  extraMinutes: 0,
});

/** Enregistrement à zéro (non écrit en base) si rien n'existe encore pour ce jour. */
export async function getUsage(profileId: string, day: string): Promise<UsageDay> {
  const db = await getDB();
  const existing = await db.get('usage', [profileId, day]);
  return existing ?? emptyUsage(profileId, day);
}

export async function addActiveSeconds(profileId: string, day: string, seconds: number): Promise<UsageDay> {
  const db = await getDB();
  const tx = db.transaction('usage', 'readwrite');
  const existing = await tx.store.get([profileId, day]);
  const updated: UsageDay = existing
    ? { ...existing, activeSeconds: existing.activeSeconds + seconds }
    : { ...emptyUsage(profileId, day), activeSeconds: seconds };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

export async function grantExtraMinutes(profileId: string, day: string, minutes: number): Promise<UsageDay> {
  const db = await getDB();
  const tx = db.transaction('usage', 'readwrite');
  const existing = await tx.store.get([profileId, day]);
  const updated: UsageDay = existing
    ? { ...existing, extraMinutes: existing.extraMinutes + minutes }
    : { ...emptyUsage(profileId, day), extraMinutes: minutes };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}
