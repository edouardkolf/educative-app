// CONTRAT (signatures) — indicateurs du bloc parent. LECTURE.md §8. Pur. SOUCHE : la tâche L5 implémente.
import type { ReadingRecord } from '../../storage/readings';
import type { ReadingSettings } from './progress';
import type { ItemId, ItemState, ReadingGameId, ReadingStage } from './types';

export interface ItemStat {
  itemId: ItemId;
  /** Ce que le parent lit : « M », « OU », « Compter les syllabes ». */
  label: string;
  stage: ReadingStage;
  state: ItemState;
  seen: number;
  /** Taux de réussite du premier coup, 0 à 1, ou null si jamais vu. */
  rate: number | null;
}

export interface Confusion {
  /** Ce qui était demandé et ce qui a été choisi à la place, en clair : « M » → « N ». */
  target: string;
  chosen: string;
  count: number;
}

export interface GuessAlert {
  game: ReadingGameId;
  /** Libellé parent du jeu. */
  label: string;
  answers: number;
  rate: number;
  /** Taux attendu en répondant au hasard. */
  chance: number;
}

export interface ReadingStatsSummary {
  stage: ReadingStage;
  finished: boolean;
  sessionsCompleted: number;
  acquired: number;
  gatedTotal: number;
  items: ItemStat[];
  /** Les confusions les plus fréquentes d'abord, au plus 8. */
  confusions: Confusion[];
  /** Jeux où l'enfant semble deviner (LECTURE.md §8.3) : « à accompagner ». */
  alerts: GuessAlert[];
}

export function summarizeReading(
  _records: readonly ReadingRecord[],
  _settings: ReadingSettings | undefined,
  _now: number,
): ReadingStatsSummary {
  throw new Error('L5 : à implémenter');
}
