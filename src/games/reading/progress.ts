// CONTRAT (signatures) — maîtrise et progression, recalculées à partir des séances. LECTURE.md §5. Pur.
// SOUCHE posée par l'orchestrateur : la tâche L2 implémente.
import type { ReadingRecord } from '../../storage/readings';
import type { ReadingProgress, ReadingStage } from './types';

export interface ReadingSettings {
  /** Étape de départ choisie par le parent : les étapes d'avant sont tenues pour acquises. Absent = 1. */
  startStage?: ReadingStage;
}

/** Seuils (LECTURE.md §5), exportés pour les tests et les statistiques. */
export const STREAK_TO_ACQUIRE = 3;
export const STREAK_MIN_DAYS = 2;
export const MISSES_TO_LOSE = 2;
export const SKILL_WINDOW = 10;
export const SKILL_MIN_CORRECT = 8;
export const STAGE_MIN_RATE = 0.8;
export const STAGE_RATE_SESSIONS = 2;

/** Jour local AAAA-MM-JJ d'un instant (même convention que src/storage/day.ts). */
export function dayOf(_at: number): string {
  throw new Error('L2 : à implémenter');
}

/**
 * Progression déduite des séances (toutes, y compris abandonnées : chaque réponse compte), triées ou non.
 * Les réponses `retry` sont ignorées pour la maîtrise.
 */
export function computeProgress(_records: readonly ReadingRecord[], _settings?: ReadingSettings): ReadingProgress {
  throw new Error('L2 : à implémenter');
}
