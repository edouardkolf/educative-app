// CONTRAT — socle commun des parties de jeu (stores "dictations" et "colorings"). Voir docs/specs/HUB.md §5.2.
// Les signatures font foi ; les corps sont écrits par la tâche « stockage v2 ».
// Règles : seules les parties "in_progress" sont modifiées (F6) ; une partie close ne se rouvre jamais.
//
// Import circulaire assumé : dictations.ts et colorings.ts importent ce module (pour startGameRecord,
// updateGameRecord, finishGameRecord, listGameRecords), et ce module importe leurs validateurs/`isXFinished`
// pour bâtir sa table de règles. On ne référence ces fonctions importées que PENDANT l'exécution d'une
// fonction de ce module (jamais à l'évaluation du module) : par ce moment, les deux modules sont chargés.
import { getDB, type StorageSchema } from './db';
import type { IDBPDatabase } from 'idb';
import { isColoringFinished, isColoringRecord, type ColoringRecord } from './colorings';
import { isDictationFinished, isDictationRecord, type DictationRecord } from './dictations';
import type { GameEndReason, GameRecordBase, GameStoreName } from './types';

export type GameRecordByStore = { dictations: DictationRecord; colorings: ColoringRecord };

export const GAME_STORES: readonly GameStoreName[] = ['dictations', 'colorings'];

/** Issue d'une partie : terminée, ou abandonnée avec une raison. */
export type GameOutcome = { status: 'completed' } | { status: 'abandoned'; endReason: GameEndReason };

/** Règles propres à chaque store, lues paresseusement (évite d'exécuter du code au chargement du module). */
function rulesFor<S extends GameStoreName>(
  store: S,
): { isRecord: (value: unknown) => value is GameRecordByStore[S]; isFinished: (record: GameRecordByStore[S]) => boolean } {
  if (store === 'dictations') {
    return {
      isRecord: isDictationRecord as (value: unknown) => value is GameRecordByStore[S],
      isFinished: isDictationFinished as unknown as (record: GameRecordByStore[S]) => boolean,
    };
  }
  return {
    isRecord: isColoringRecord as (value: unknown) => value is GameRecordByStore[S],
    isFinished: isColoringFinished as unknown as (record: GameRecordByStore[S]) => boolean,
  };
}

/**
 * Crée une partie `in_progress` : `id` (UUID), `startedAt` = maintenant, `endedAt` et `endReason` à null,
 * `activeMs` à 0, plus les champs propres au jeu (`init`).
 */
export async function startGameRecord<S extends GameStoreName>(
  store: S,
  profileId: string,
  init: Omit<GameRecordByStore[S], keyof GameRecordBase>,
): Promise<GameRecordByStore[S]> {
  const db = await getDB();
  const record = {
    ...init,
    id: crypto.randomUUID(),
    profileId,
    startedAt: Date.now(),
    endedAt: null,
    status: 'in_progress',
    endReason: null,
    activeMs: 0,
  } as GameRecordByStore[S];
  // Le store n'est connu qu'au type générique S : idb ne résout pas la surcharge exacte ici.
  await (db as IDBPDatabase<StorageSchema>).put(store as GameStoreName, record as never);
  return record;
}

/**
 * Applique `update` à une partie `in_progress`, en une transaction ; sinon ne change rien et ne lève rien.
 * Les champs de base (id, profileId, startedAt, endedAt, status, endReason) sont rétablis après `update`.
 */
export async function updateGameRecord<S extends GameStoreName>(
  store: S,
  id: string,
  update: (record: GameRecordByStore[S]) => GameRecordByStore[S],
): Promise<GameRecordByStore[S] | undefined> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  const current = (await tx.store.get(id)) as GameRecordByStore[S] | undefined;
  if (!current || current.status !== 'in_progress') {
    await tx.done;
    return current;
  }
  const updated = { ...update(current), id: current.id, profileId: current.profileId, startedAt: current.startedAt,
    endedAt: current.endedAt, status: current.status, endReason: current.endReason };
  await tx.store.put(updated as never);
  await tx.done;
  return updated as GameRecordByStore[S];
}

/** Clôt une partie `in_progress` (`endedAt` = maintenant), après un éventuel dernier `update` ; sinon ne fait rien. */
export async function finishGameRecord<S extends GameStoreName>(
  store: S,
  id: string,
  outcome: GameOutcome,
  update?: (record: GameRecordByStore[S]) => GameRecordByStore[S],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  const current = (await tx.store.get(id)) as GameRecordByStore[S] | undefined;
  if (!current || current.status !== 'in_progress') {
    await tx.done;
    return;
  }
  const base = update ? update(current) : current;
  const updated: GameRecordByStore[S] = {
    ...base,
    id: current.id,
    profileId: current.profileId,
    startedAt: current.startedAt,
    endedAt: Date.now(),
    status: outcome.status,
    endReason: outcome.status === 'abandoned' ? outcome.endReason : null,
  };
  await tx.store.put(updated as never);
  await tx.done;
}

/** Parties d'un profil dans un store, triées par `startedAt` croissant (index `profileId`). */
export async function listGameRecords<S extends GameStoreName>(
  store: S,
  profileId: string,
): Promise<GameRecordByStore[S][]> {
  const db = (await getDB()) as IDBPDatabase<StorageSchema>;
  const records = (await db.getAllFromIndex(store as GameStoreName, 'profileId', profileId)) as GameRecordByStore[S][];
  return records.sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Au démarrage de l'app (à côté de `closeStaleRuns`) : toute partie de jeu restée `in_progress` passe à
 * `completed` si elle est finie (`isDictationFinished`, `isColoringFinished` : comme F7), sinon à `abandoned`
 * avec `time-up` (verrou de CE profil posé après son début, comme F6) ou `closed`. `endedAt = startedAt + activeMs`.
 * Renvoie le nombre de parties clôturées.
 */
export async function closeStaleGameRecords(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(['dictations', 'colorings', 'settings'], 'readwrite');
  const lock = (await tx.objectStore('settings').get('app'))?.lock ?? null;
  let count = 0;
  for (const store of GAME_STORES) {
    const { isFinished } = rulesFor(store);
    const objectStore = tx.objectStore(store);
    let cursor = await objectStore.openCursor();
    while (cursor) {
      const record = cursor.value as GameRecordBase;
      if (record.status === 'in_progress') {
        const finished = isFinished(record as never);
        const softEndOfThisProfile =
          lock !== null && lock.profileId === record.profileId && lock.lockedAt >= record.startedAt;
        await cursor.update({
          ...cursor.value,
          status: finished ? 'completed' : 'abandoned',
          endReason: finished ? null : softEndOfThisProfile ? 'time-up' : 'closed',
          endedAt: record.startedAt + record.activeMs,
        } as never);
        count += 1;
      }
      cursor = await cursor.continue();
    }
  }
  await tx.done;
  return count;
}

/** Champs communs valides (import) : ids non vides, horodatages finis, statut, raison, `activeMs` ≥ 0. */
export function isGameRecordBase(value: unknown): value is GameRecordBase {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0) return false;
  if (typeof v.profileId !== 'string' || v.profileId.length === 0) return false;
  if (typeof v.startedAt !== 'number' || !Number.isFinite(v.startedAt)) return false;
  if (v.endedAt !== null && (typeof v.endedAt !== 'number' || !Number.isFinite(v.endedAt))) return false;
  if (v.status !== 'in_progress' && v.status !== 'completed' && v.status !== 'abandoned') return false;
  if (v.endReason !== null && v.endReason !== 'quit' && v.endReason !== 'closed' && v.endReason !== 'time-up') {
    return false;
  }
  if (typeof v.activeMs !== 'number' || !Number.isFinite(v.activeMs) || v.activeMs < 0) return false;
  return true;
}
