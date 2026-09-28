// Aides pures pour l'import d'une sauvegarde : lecture JSON et message de confirmation
// (logique pure — voir import.test.ts). L'écriture réelle reste entièrement dans `storage.importAll`.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse le texte d'un fichier importé ; message clair (pas de jargon) si ce n'est pas du JSON valide. */
export function parseImportFile(text: string): { data: unknown } | { error: string } {
  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: "Ce fichier n'est pas lisible : ce n'est pas une sauvegarde valide." };
  }
}

/** Longueur d'un tableau d'un champ de `data`, ou 0 si absent / pas un tableau. */
function arrayLength(data: unknown, key: string): number {
  return isPlainObject(data) && Array.isArray(data[key]) ? data[key].length : 0;
}

/**
 * Compte les enfants et parties d'une sauvegarde pas encore validée, pour l'étape de confirmation.
 * Les parties incluent celles des jeux libres (dictée, coloriage) : « partie » désigne aussi bien une
 * partie de niveau qu'une partie de jeu (cadre §3.5).
 */
export function describeImportCounts(data: unknown): { profiles: number; runs: number } {
  const profiles = arrayLength(data, 'profiles');
  const runs = arrayLength(data, 'runs') + arrayLength(data, 'dictations') + arrayLength(data, 'colorings');
  return { profiles, runs };
}

/** Phrase de confirmation avant de remplacer toutes les données locales par la sauvegarde importée. */
export function formatImportConfirmation(counts: { profiles: number; runs: number }): string {
  const child = counts.profiles === 1 ? 'enfant' : 'enfants';
  const game = counts.runs === 1 ? 'partie' : 'parties';
  return `Remplacer toutes les données actuelles par cette sauvegarde (${counts.profiles} ${child}, ${counts.runs} ${game}) ?`;
}

/**
 * Message après un import réussi (F2) : mentionne les lignes orphelines ignorées (parties/réglages/
 * temps d'un enfant absent de la sauvegarde) seulement quand `skipped > 0`. `runs` compte les parties
 * de niveaux ; `gameRecords` les parties de jeux libres (dictée, coloriage) : la formulation ne change pas.
 */
export function formatImportSuccess(result: {
  profiles: number;
  runs: number;
  gameRecords: number;
  skipped: number;
}): string {
  const base = `Sauvegarde importée : ${result.profiles} enfant(s), ${result.runs + result.gameRecords} partie(s).`;
  if (result.skipped <= 0) return base;
  return `${base} ${result.skipped} enregistrement(s) sans enfant correspondant ont été ignorés.`;
}
