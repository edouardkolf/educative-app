// Export / import complet : la sauvegarde JSON déclenchée par le parent.
// L'import valide TOUT d'abord (sans écrire), puis remplace toutes les données en une transaction.
import { getDB } from './db';
import { DEFAULT_SETTINGS } from './settings';
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  type AppSettings,
  type EndReason,
  type ExportBundle,
  type ImportResult,
  type LevelOverride,
  type Profile,
  type RoundRecord,
  type Run,
  type RunStatus,
  type UsageDay,
} from './types';

export async function exportAll(): Promise<ExportBundle> {
  const db = await getDB();
  const [profiles, allRuns, allOverrides, allUsage, settings] = await Promise.all([
    db.getAll('profiles'),
    db.getAll('runs'),
    db.getAll('overrides'),
    db.getAll('usage'),
    db.get('settings', 'app'),
  ]);
  // F2 : ne jamais exporter les lignes orphelines (parties/réglages/temps d'un enfant supprimé,
  // écrites via un profil resté en mémoire) — même si elles traînent encore dans cette base locale.
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const runs = allRuns.filter((run) => profileIds.has(run.profileId));
  const overrides = allOverrides.filter((override) => profileIds.has(override.profileId));
  const usage = allUsage.filter((day) => profileIds.has(day.profileId));
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profiles,
    runs,
    overrides,
    usage,
    settings: { soundOn: (settings ?? DEFAULT_SETTINGS).soundOn },
  };
}

// ---------- Validation (aucune écriture tant que tout n'est pas vérifié) ----------

const BAD_FORMAT = "Ce fichier n'est pas une sauvegarde Petits Malins.";
const BAD_VERSION = "Cette sauvegarde vient d'une autre version de l'application.";
const BAD_SHAPE = 'Ce fichier de sauvegarde est incomplet ou abîmé.';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** F11 : une limite de temps importée est soit absente (illimité), soit un entier de 1 à 600 minutes. */
function isLimitMinutes(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 600);
}

/** F11 : jour local strictement au format "AAAA-MM-JJ" (voir `dayKey`). */
function isDayString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isRoundRecord(value: unknown): value is RoundRecord {
  if (!isPlainObject(value)) return false;
  return (
    isFiniteNumber(value.index) &&
    isFiniteNumber(value.taps) &&
    typeof value.firstTry === 'boolean' &&
    isFiniteNumber(value.durationMs)
  );
}

function isRunStatus(value: unknown): value is RunStatus {
  return value === 'in_progress' || value === 'completed' || value === 'abandoned';
}

function isEndReason(value: unknown): value is EndReason {
  return value === 'quit' || value === 'closed' || value === 'time-up';
}

function isStars(value: unknown): value is Run['stars'] {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isProfile(value: unknown): value is Profile {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (typeof value.name !== 'string') return false;
  if (!isNonEmptyString(value.avatar)) return false;
  if (!isNonEmptyString(value.trackId)) return false;
  if (!isFiniteNumber(value.createdAt)) return false;
  if (!isPlainObject(value.limits)) return false;
  const { sessionMinutes, dailyMinutes } = value.limits;
  if (!isLimitMinutes(sessionMinutes)) return false;
  if (!isLimitMinutes(dailyMinutes)) return false;
  return true;
}

function isRun(value: unknown): value is Run {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.profileId)) return false;
  if (!isNonEmptyString(value.levelId)) return false;
  if (!isNonEmptyString(value.trackId)) return false;
  if (!isFiniteNumber(value.startedAt)) return false;
  if (value.endedAt !== null && !isFiniteNumber(value.endedAt)) return false;
  if (!isRunStatus(value.status)) return false;
  if (value.endReason !== null && !isEndReason(value.endReason)) return false;
  if (typeof value.replay !== 'boolean') return false;
  if (!Array.isArray(value.rounds) || !value.rounds.every(isRoundRecord)) return false;
  if (!isStars(value.stars)) return false;
  return true;
}

function isOverride(value: unknown): value is LevelOverride {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.profileId)) return false;
  if (!isNonEmptyString(value.levelId)) return false;
  return value.state === 'unlocked' || value.state === 'locked';
}

function isUsageDay(value: unknown): value is UsageDay {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.profileId)) return false;
  if (!isDayString(value.day)) return false;
  if (!isFiniteNumber(value.activeSeconds)) return false;
  if (!isFiniteNumber(value.extraMinutes)) return false;
  return true;
}

/** F11 : ids uniques au sein d'un même type d'enregistrement (deux profils/parties ne peuvent
 * partager un id — une collision écraserait silencieusement l'un des deux au `put`). */
function hasUniqueIds<T>(items: T[], id: (item: T) => string): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const key = id(item);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

interface ValidatedBundle {
  profiles: Profile[];
  runs: Run[];
  overrides: LevelOverride[];
  usage: UsageDay[];
  soundOn: boolean;
  /** F2 : nombre de lignes ignorées parce qu'elles référencent un enfant absent de la sauvegarde. */
  skipped: number;
}

function validateImportData(data: unknown): { bundle: ValidatedBundle } | { error: string } {
  if (!isPlainObject(data) || data.format !== EXPORT_FORMAT) {
    return { error: BAD_FORMAT };
  }
  if (data.version !== EXPORT_VERSION) {
    return { error: BAD_VERSION };
  }

  const { profiles, runs, overrides, usage, settings } = data;
  if (!Array.isArray(profiles) || !profiles.every(isProfile)) return { error: BAD_SHAPE };
  if (!Array.isArray(runs) || !runs.every(isRun)) return { error: BAD_SHAPE };
  if (!Array.isArray(overrides) || !overrides.every(isOverride)) return { error: BAD_SHAPE };
  // F11 : ids uniques par type d'enregistrement (jamais entre profils et parties, par exemple).
  if (!hasUniqueIds(profiles, (p) => p.id)) return { error: BAD_SHAPE };
  if (!hasUniqueIds(runs, (r) => r.id)) return { error: BAD_SHAPE };
  if (!Array.isArray(usage) || !usage.every(isUsageDay)) return { error: BAD_SHAPE };
  if (!isPlainObject(settings) || typeof settings.soundOn !== 'boolean') return { error: BAD_SHAPE };
  const soundOn = settings.soundOn;

  // F2 : une ligne dont l'enfant est absent de la sauvegarde (parties/réglages/temps écrits via un
  // profil resté en mémoire après suppression) est ignorée plutôt que de faire échouer tout l'import.
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const keptRuns = runs.filter((run) => profileIds.has(run.profileId));
  const keptOverrides = overrides.filter((override) => profileIds.has(override.profileId));
  const keptUsage = usage.filter((day) => profileIds.has(day.profileId));
  const skipped =
    runs.length - keptRuns.length + (overrides.length - keptOverrides.length) + (usage.length - keptUsage.length);

  return { bundle: { profiles, runs: keptRuns, overrides: keptOverrides, usage: keptUsage, soundOn, skipped } };
}

/**
 * Valide `data` (format, version, forme des enregistrements) puis REMPLACE toutes les données
 * (profils, parties, réglages de niveaux, temps de jeu) en une seule transaction. Les lignes
 * orphelines sont ignorées (F2), jamais réécrites. Conserve le code parent. En cas d'erreur de
 * format/version/forme, rien n'est modifié.
 */
export async function importAll(data: unknown): Promise<ImportResult> {
  const validation = validateImportData(data);
  if ('error' in validation) {
    return { ok: false, error: validation.error };
  }
  const { bundle } = validation;

  const db = await getDB();
  const tx = db.transaction(['profiles', 'runs', 'overrides', 'usage', 'settings'], 'readwrite');
  const profiles = tx.objectStore('profiles');
  const runs = tx.objectStore('runs');
  const overrides = tx.objectStore('overrides');
  const usage = tx.objectStore('usage');
  const settings = tx.objectStore('settings');

  await Promise.all([profiles.clear(), runs.clear(), overrides.clear(), usage.clear()]);
  await Promise.all([
    ...bundle.profiles.map((profile) => profiles.put(profile)),
    ...bundle.runs.map((run) => runs.put(run)),
    ...bundle.overrides.map((override) => overrides.put(override)),
    ...bundle.usage.map((day) => usage.put(day)),
  ]);

  const existingSettings = (await settings.get('app')) ?? DEFAULT_SETTINGS;
  const nextSettings: AppSettings = {
    ...existingSettings,
    soundOn: bundle.soundOn,
    // F3 : une session par enfant ; F1 : jamais d'écran de fin hérité d'avant l'import.
    sessions: {},
    lock: null,
  };
  await settings.put(nextSettings, 'app');

  await tx.done;
  return { ok: true, profiles: bundle.profiles.length, runs: bundle.runs.length, skipped: bundle.skipped };
}
