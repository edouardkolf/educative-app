// CONTRAT — socle commun des parties de jeu (stores "dictations" et "colorings"). Voir docs/specs/HUB.md §5.2.
// Les signatures font foi ; les corps sont écrits par la tâche « stockage v2 ».
// Règles : seules les parties "in_progress" sont modifiées (F6) ; une partie close ne se rouvre jamais.
import type { ColoringRecord } from './colorings';
import type { DictationRecord } from './dictations';
import type { GameEndReason, GameRecordBase, GameStoreName } from './types';

export type GameRecordByStore = { dictations: DictationRecord; colorings: ColoringRecord };

export const GAME_STORES: readonly GameStoreName[] = ['dictations', 'colorings'];

/** Issue d'une partie : terminée, ou abandonnée avec une raison. */
export type GameOutcome = { status: 'completed' } | { status: 'abandoned'; endReason: GameEndReason };

/**
 * Crée une partie `in_progress` : `id` (UUID), `startedAt` = maintenant, `endedAt` et `endReason` à null,
 * `activeMs` à 0, plus les champs propres au jeu (`init`).
 */
export async function startGameRecord<S extends GameStoreName>(
  _store: S,
  _profileId: string,
  _init: Omit<GameRecordByStore[S], keyof GameRecordBase>,
): Promise<GameRecordByStore[S]> {
  throw new Error('startGameRecord : à implémenter (docs/specs/HUB.md §5.2)');
}

/**
 * Applique `update` à une partie `in_progress`, en une transaction ; sinon ne change rien et ne lève rien.
 * Les champs de base (id, profileId, startedAt, endedAt, status, endReason) sont rétablis après `update`.
 */
export async function updateGameRecord<S extends GameStoreName>(
  _store: S,
  _id: string,
  _update: (record: GameRecordByStore[S]) => GameRecordByStore[S],
): Promise<GameRecordByStore[S] | undefined> {
  throw new Error('updateGameRecord : à implémenter (docs/specs/HUB.md §5.2)');
}

/** Clôt une partie `in_progress` (`endedAt` = maintenant), après un éventuel dernier `update` ; sinon ne fait rien. */
export async function finishGameRecord<S extends GameStoreName>(
  _store: S,
  _id: string,
  _outcome: GameOutcome,
  _update?: (record: GameRecordByStore[S]) => GameRecordByStore[S],
): Promise<void> {
  throw new Error('finishGameRecord : à implémenter (docs/specs/HUB.md §5.2)');
}

/** Parties d'un profil dans un store, triées par `startedAt` croissant (index `profileId`). */
export async function listGameRecords<S extends GameStoreName>(
  _store: S,
  _profileId: string,
): Promise<GameRecordByStore[S][]> {
  return [];
}

/**
 * Au démarrage de l'app (à côté de `closeStaleRuns`) : toute partie de jeu restée `in_progress` passe à
 * `completed` si elle est finie (`isDictationFinished`, `isColoringFinished` : comme F7), sinon à `abandoned`
 * avec `time-up` (verrou de CE profil posé après son début, comme F6) ou `closed`. `endedAt = startedAt + activeMs`.
 * Renvoie le nombre de parties clôturées.
 */
export async function closeStaleGameRecords(): Promise<number> {
  return 0;
}

/** Champs communs valides (import) : ids non vides, horodatages finis, statut, raison, `activeMs` ≥ 0. */
export function isGameRecordBase(_value: unknown): _value is GameRecordBase {
  return false;
}
