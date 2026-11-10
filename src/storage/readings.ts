// CONTRAT — séances de « J'apprends à lire » (store "readings", DB v5). Voir docs/specs/LECTURE.md §7.
// Une partie = une séance (8 à 10 questions). Créée à la première réponse (arbitrage A9), close quand
// toutes les questions prévues ont une première réponse.
// SOUCHE posée par l'orchestrateur : la tâche L1 implémente (modèle : src/storage/hangmans.ts).
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import type { ItemId, ReadingAnswer, ReadingGameId, ReadingStage } from '../games/reading/types';
import type { GameEndReason, GameRecordBase } from './types';

export interface ReadingRecord extends GameRecordBase {
  stage: ReadingStage;
  /** Questions prévues par la séance (hors questions reposées). */
  planned: number;
  /** Item introduit par la séance, ou null. */
  newItemId: ItemId | null;
  /** Jeux dont la démonstration a été faite pendant cette séance. */
  demos: ReadingGameId[];
  /** Premières tentatives, dans l'ordre (questions reposées comprises, `retry: true`). */
  answers: ReadingAnswer[];
  /** true : séance de révision d'une étape déjà validée, lancée depuis l'accueil. */
  review: boolean;
}

/** Réglage par enfant (fiche enfant) : `Profile.gameSettings.reading`. */
export interface ReadingSettingsValue {
  startStage?: ReadingStage;
}

export type ReadingInit = Pick<ReadingRecord, 'stage' | 'planned' | 'newItemId' | 'demos' | 'answers' | 'review'>;

export async function startReading(_profileId: string, _init: ReadingInit): Promise<ReadingRecord> {
  throw new Error('L1 : à implémenter');
}

export async function saveReadingAnswers(
  _id: string,
  _answers: ReadingAnswer[],
  _demos: ReadingGameId[],
  _activeMs: number,
): Promise<void> {
  throw new Error('L1 : à implémenter');
}

export async function completeReading(
  _id: string,
  _answers: ReadingAnswer[],
  _demos: ReadingGameId[],
  _activeMs: number,
): Promise<void> {
  throw new Error('L1 : à implémenter');
}

export async function abandonReading(_id: string, _reason: GameEndReason, _activeMs?: number): Promise<void> {
  throw new Error('L1 : à implémenter');
}

export async function listReadings(_profileId: string): Promise<ReadingRecord[]> {
  throw new Error('L1 : à implémenter');
}

/** Toutes les questions prévues ont une première réponse (sert à la clôture au lancement). */
export function isReadingFinished(_record: ReadingRecord): boolean {
  throw new Error('L1 : à implémenter');
}

/** Validation à l'import. */
export function isReadingRecord(_value: unknown): _value is ReadingRecord {
  throw new Error('L1 : à implémenter');
}
