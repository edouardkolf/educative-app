// CONTRAT — séances de « J'apprends à lire » (store "readings", DB v5). Voir docs/specs/LECTURE.md §7.
// Une partie = une séance (8 à 10 questions). Créée à la première réponse (arbitrage A9), close quand
// toutes les questions prévues ont une première réponse.
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import { READING_GAMES, READING_SKILLS } from '../games/reading/types';
import type { ItemId, ReadingAnswer, ReadingGameId, ReadingStage } from '../games/reading/types';
import { finishGameRecord, isGameRecordBase, listGameRecords, startGameRecord, updateGameRecord } from './game-records';
import type { GameEndReason, GameRecordBase } from './types';
import { isFiniteNumber, isNonEmptyString, isPlainObject } from './validate';

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
  /** true : niveau déjà gagné, rejoué depuis l'accueil. */
  review: boolean;
  /** Niveau du parcours (src/games/reading/levels.ts). Absent sur les séances d'avant le parcours (ignorées). */
  levelId?: string;
}

/** Réglage par enfant (fiche enfant) : `Profile.gameSettings.reading`. */
export interface ReadingSettingsValue {
  startStage?: ReadingStage;
}

export type ReadingInit = Pick<ReadingRecord, 'stage' | 'planned' | 'newItemId' | 'demos' | 'answers' | 'review' | 'levelId'>;

/** Une séance ne dépasse jamais 60 premières tentatives (10 questions prévues + questions reposées). */
const MAX_ANSWERS = 60;

export async function startReading(profileId: string, init: ReadingInit): Promise<ReadingRecord> {
  return startGameRecord('readings', profileId, {
    ...init,
    demos: [...init.demos],
    answers: [...init.answers],
  });
}

export async function saveReadingAnswers(
  id: string,
  answers: ReadingAnswer[],
  demos: ReadingGameId[],
  activeMs: number,
): Promise<void> {
  await updateGameRecord('readings', id, (record) => ({ ...record, answers: [...answers], demos: [...demos], activeMs }));
}

export async function completeReading(
  id: string,
  answers: ReadingAnswer[],
  demos: ReadingGameId[],
  activeMs: number,
): Promise<void> {
  await finishGameRecord('readings', id, { status: 'completed' }, (record) => ({
    ...record,
    answers: [...answers],
    demos: [...demos],
    activeMs,
  }));
}

export async function abandonReading(id: string, reason: GameEndReason, activeMs?: number): Promise<void> {
  await finishGameRecord('readings', id, { status: 'abandoned', endReason: reason }, (record) =>
    activeMs === undefined ? record : { ...record, activeMs },
  );
}

export async function listReadings(profileId: string): Promise<ReadingRecord[]> {
  return listGameRecords('readings', profileId);
}

/** Toutes les questions prévues ont une première réponse (sert à la clôture au lancement). */
export function isReadingFinished(record: ReadingRecord): boolean {
  return record.answers.filter((answer) => !answer.retry).length >= record.planned;
}

function isReadingStage(value: unknown): value is ReadingStage {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
}

function isReadingGame(value: unknown): value is ReadingGameId {
  return typeof value === 'string' && (READING_GAMES as readonly string[]).includes(value);
}

/** `g:<graphème>` (minuscules, 1 à 3 lettres) ou `k:<compétence connue>`. */
function isItemId(value: unknown): value is ItemId {
  if (typeof value !== 'string') return false;
  if (value.startsWith('g:')) return /^g:[a-zéèêàâîôûùç]{1,3}$/.test(value);
  if (value.startsWith('k:')) return (READING_SKILLS as readonly string[]).includes(value.slice(2));
  return false;
}

function isReadingAnswer(value: unknown): value is ReadingAnswer {
  if (!isPlainObject(value)) return false;
  if (!isItemId(value.itemId) || !isReadingGame(value.game)) return false;
  if (!isNonEmptyString(value.target) || value.target.length > 64) return false;
  if (typeof value.correct !== 'boolean') return false;
  if (value.chosen !== null && !(isNonEmptyString(value.chosen) && value.chosen.length <= 64)) return false;
  if (!Number.isInteger(value.choiceCount) || (value.choiceCount as number) < 0 || (value.choiceCount as number) > 10) {
    return false;
  }
  if (!Number.isInteger(value.replays) || (value.replays as number) < 0) return false;
  if (typeof value.hinted !== 'boolean' || typeof value.retry !== 'boolean') return false;
  if (!isFiniteNumber(value.ms) || value.ms < 0) return false;
  return isFiniteNumber(value.at);
}

/** Réglage parent « étape de départ » : absent ou entier de 1 à 5 (validé à l'import, comme le coloriage). */
export function isReadingSettings(value: unknown): value is ReadingSettingsValue {
  if (!isPlainObject(value)) return false;
  return value.startStage === undefined || isReadingStage(value.startStage);
}

/** Validation à l'import. */
export function isReadingRecord(value: unknown): value is ReadingRecord {
  if (!isGameRecordBase(value) || !isPlainObject(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  if (!isReadingStage(v.stage)) return false;
  if (!Number.isInteger(v.planned) || (v.planned as number) < 1 || (v.planned as number) > MAX_ANSWERS) return false;
  if (v.newItemId !== null && !isItemId(v.newItemId)) return false;
  if (!Array.isArray(v.demos) || v.demos.length > READING_GAMES.length || !v.demos.every(isReadingGame)) return false;
  if (new Set(v.demos).size !== v.demos.length) return false;
  if (!Array.isArray(v.answers) || v.answers.length > MAX_ANSWERS || !v.answers.every(isReadingAnswer)) return false;
  if (typeof v.review !== 'boolean') return false;
  if (v.levelId !== undefined && !(isNonEmptyString(v.levelId) && v.levelId.length <= 40)) return false;
  return true;
}
