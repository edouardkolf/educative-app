// CONTRAT (signatures) — composition d'une séance et fabrication des questions. LECTURE.md §5.4 et §4. Pur.
// SOUCHE posée par l'orchestrateur : la tâche L2 implémente.
import type { Rng } from '../../engine/types';
import type { ReadingProgress, ReadingQuestion, ReadingSessionPlan, ReadingStage } from './types';

export const SESSION_MIN_QUESTIONS = 8;
export const SESSION_MAX_QUESTIONS = 10;

export interface PlanOptions {
  /** Séance de révision d'une étape déjà validée (choisie sur l'écran d'accueil). Absent = étape en cours. */
  stage?: ReadingStage;
}

/** Séance déterministe pour une graine donnée. Ne lève jamais : toute progression valide donne une séance. */
export function planSession(_progress: ReadingProgress, _rng: Rng, _opts?: PlanOptions): ReadingSessionPlan {
  throw new Error('L2 : à implémenter');
}

/**
 * Après une erreur : la même question est reposée plus tard dans la séance (2 à 4 questions plus loin, ou en
 * dernier), une seule fois par question. Renvoie la nouvelle file ; `index` = position de la question ratée.
 */
export function requeueAfterMiss(_queue: readonly ReadingQuestion[], _index: number): ReadingQuestion[] {
  throw new Error('L2 : à implémenter');
}
