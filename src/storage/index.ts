// CONTRAT — API de stockage. Les signatures font foi ; l'agent « stockage » remplace les corps.
// Implémentation : IndexedDB via la bibliothèque `idb`, base "petits-malins".
// Le code est réparti dans les fichiers voisins (db, profiles, runs, overrides, usage, settings,
// export-import) et réexporté ici : cette API reste la seule frontière que les autres modules utilisent.

export * from './types';

// ---------- Utilitaires ----------

/** Jour local "YYYY-MM-DD" (pas UTC : minuit = minuit à la maison). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Connexion IndexedDB mise en cache : la fermer et l'oublier. Utilisé par les tests entre deux cas. */
export { __resetForTests } from './db';

// ---------- Réglages de l'app (code parent, son, session, écran de fin) ----------
export { requestPersistence, isPersisted, getSettings, updateSettings } from './settings';

// ---------- Profils ----------
export { listProfiles, getProfile, saveProfile, deleteProfile } from './profiles';

// ---------- Parties ----------
export { startRun, recordRound, completeRun, abandonRun, closeStaleRuns, listRuns } from './runs';

// ---------- Réglages manuels de niveaux ----------
export { listOverrides, setOverride } from './overrides';

// ---------- Temps de jeu ----------
export { getUsage, addActiveSeconds, grantExtraMinutes } from './usage';

// ---------- Export / import ----------
export { exportAll, importAll } from './export-import';
