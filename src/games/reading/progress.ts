// CONTRAT (signatures) — maîtrise et progression, recalculées à partir des séances. LECTURE.md §5. Pur.
import { dayKey } from '../../storage/day';
import type { ReadingRecord } from '../../storage/readings';
import { allItems, gatedItems, stageItems } from './curriculum';
import { READING_STAGES } from './types';
import type { ItemId, ItemProgress, ReadingGameId, ReadingProgress, ReadingStage } from './types';

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
/** Un item de compétence acquis repasse en apprentissage quand la fenêtre tombe à ce nombre de justes ou moins. */
export const SKILL_LOSE_CORRECT = 5;
export const STAGE_MIN_RATE = 0.8;
export const STAGE_RATE_SESSIONS = 2;

/** Jour local AAAA-MM-JJ d'un instant (même convention que src/storage/day.ts). */
export function dayOf(at: number): string {
  return dayKey(new Date(at));
}

/** Description du programme dont le calcul a besoin (injectable pour les tests). */
export interface ReadingProgram {
  /** Tous les items du programme. */
  items: readonly ItemId[];
  /** Items d'une étape (sert au démarrage à une étape avancée). */
  stageItems: (stage: ReadingStage) => readonly ItemId[];
  /** Items qui bloquent le passage de l'étape. */
  gatedItems: (stage: ReadingStage) => readonly ItemId[];
}

/** Programme réel (curriculum.ts). */
export function realProgram(): ReadingProgram {
  return { items: allItems(), stageItems, gatedItems };
}

/** Compteurs internes d'un item (l'historique sert à la fenêtre des compétences). */
interface ItemWork {
  progress: ItemProgress;
  /** Résultats et jours des réponses comptées, dans l'ordre (fenêtre des compétences). */
  history: { correct: boolean; day: string }[];
}

function isSkill(id: ItemId): boolean {
  return id.startsWith('k:');
}

function freshItem(state: ItemProgress['state']): ItemWork {
  return {
    progress: { state, seen: 0, correct: 0, streak: 0, missStreak: 0, streakDays: [], lastSeenAt: null },
    history: [],
  };
}

/** Applique une réponse (première tentative) à un item : règles du §5.1 et §5.2. */
function applyAnswer(work: ItemWork, itemId: ItemId, correct: boolean, at: number): void {
  const p = work.progress;
  const day = dayOf(at);
  const wasAcquired = p.state === 'acquired';
  if (p.state === 'new') p.state = 'learning';
  p.seen += 1;
  p.lastSeenAt = at;
  work.history.push({ correct, day });
  if (correct) {
    p.correct += 1;
    p.streak += 1;
    p.missStreak = 0;
    if (!p.streakDays.includes(day)) p.streakDays = [...p.streakDays, day];
  } else {
    p.streak = 0;
    p.missStreak += 1;
    p.streakDays = [];
  }

  if (!isSkill(itemId)) {
    // Graphème : 3 bonnes d'affilée sur au moins 2 jours ; 2 erreurs d'affilée font perdre l'acquis.
    if (wasAcquired && p.missStreak >= MISSES_TO_LOSE) {
      p.state = 'learning';
      p.missStreak = 0;
    } else if (p.state === 'learning' && p.streak >= STREAK_TO_ACQUIRE && p.streakDays.length >= STREAK_MIN_DAYS) {
      p.state = 'acquired';
    }
    return;
  }
  // Compétence : fenêtre glissante des 10 dernières réponses.
  const window = work.history.slice(-SKILL_WINDOW);
  const right = window.filter((h) => h.correct).length;
  const days = new Set(window.map((h) => h.day)).size;
  if (wasAcquired) {
    if (window.length >= SKILL_WINDOW && right <= SKILL_LOSE_CORRECT) p.state = 'learning';
  } else if (p.seen >= SKILL_WINDOW && right >= SKILL_MIN_CORRECT && days >= STREAK_MIN_DAYS) {
    p.state = 'acquired';
  }
}

type Event =
  | { at: number; order: number; kind: 'answer'; itemId: ItemId; correct: boolean }
  | { at: number; order: number; kind: 'complete'; stage: ReadingStage; review: boolean; right: number; total: number };

/**
 * Cœur du calcul, indépendant du contenu : le programme est passé en paramètre.
 * Choix d'interprétation : la fenêtre des 10 s'applique aux jours (≥ 2 jours dans la fenêtre) ; la perte d'une
 * compétence exige une fenêtre pleine (10 réponses) ; le taux d'étape est groupé sur les 2 séances (réponses
 * justes / réponses non `retry`), `itemId` hors programme compris.
 */
export function computeProgressFor(
  program: ReadingProgram,
  records: readonly ReadingRecord[],
  settings?: ReadingSettings,
): ReadingProgress {
  const startStage: ReadingStage = settings?.startStage ?? 1;
  const known = new Set<string>(program.items);

  // État initial : tous les items du programme ; ceux des étapes avant `startStage` partent acquis.
  const works = new Map<string, ItemWork>();
  for (const id of program.items) works.set(id, freshItem('new'));
  for (const stage of READING_STAGES) {
    if (stage >= startStage) continue;
    for (const id of program.stageItems(stage)) works.set(id, freshItem('acquired'));
  }

  // Séances triées (stable) par début, puis événements triés par instant (réponses avant clôture à égalité).
  const sorted = records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => a.record.startedAt - b.record.startedAt || a.index - b.index);
  const events: Event[] = [];
  const demosDone: ReadingGameId[] = [];
  let sessionsCompleted = 0;
  let order = 0;
  for (const { record } of sorted) {
    for (const game of record.demos) if (!demosDone.includes(game)) demosDone.push(game);
    let lastAt = record.startedAt;
    let counted = 0;
    let right = 0;
    for (const answer of record.answers) {
      if (answer.at > lastAt) lastAt = answer.at;
      if (answer.retry) continue;
      counted += 1;
      if (answer.correct) right += 1;
      events.push({ at: answer.at, order: order++, kind: 'answer', itemId: answer.itemId, correct: answer.correct });
    }
    if (record.status === 'completed') {
      sessionsCompleted += 1;
      events.push({
        at: Math.max(record.endedAt ?? lastAt, lastAt),
        order: order++,
        kind: 'complete',
        stage: record.stage,
        review: record.review,
        right,
        total: counted,
      });
    }
  }
  events.sort((a, b) => a.at - b.at || (a.kind === b.kind ? 0 : a.kind === 'answer' ? -1 : 1) || a.order - b.order);

  // Rejeu chronologique : maîtrise des items, taux de séance, validation monotone des étapes.
  const rates = new Map<ReadingStage, { right: number; total: number }[]>();
  let stage = startStage as number; // première étape non validée (6 = tout validé)
  const advance = (): void => {
    while (stage <= 5) {
      const current = stage as ReadingStage;
      const gated = program.gatedItems(current);
      if (!gated.every((id) => works.get(id)?.progress.state === 'acquired')) return;
      const recent = (rates.get(current) ?? []).slice(-STAGE_RATE_SESSIONS);
      if (recent.length < STAGE_RATE_SESSIONS) return;
      const total = recent.reduce((sum, r) => sum + r.total, 0);
      const right = recent.reduce((sum, r) => sum + r.right, 0);
      if (total === 0 || right / total < STAGE_MIN_RATE - 1e-9) return;
      stage += 1;
    }
  };
  advance(); // programme sans item bloquant ni séance exigée : rien à valider sans séances
  for (const event of events) {
    if (event.kind === 'answer') {
      if (known.has(event.itemId)) {
        const work = works.get(event.itemId) ?? freshItem('new');
        works.set(event.itemId, work);
        applyAnswer(work, event.itemId, event.correct, event.at);
      }
    } else if (!event.review) {
      const list = rates.get(event.stage) ?? [];
      list.push({ right: event.right, total: event.total });
      rates.set(event.stage, list);
    }
    advance();
  }

  const items: Record<string, ItemProgress> = {};
  for (const [id, work] of works) items[id] = work.progress;
  const finished = stage > 5;
  return {
    stage: (finished ? 5 : stage) as ReadingStage,
    finished,
    items,
    demosDone,
    sessionsCompleted,
  };
}

/** Progression déduite des séances (toutes, y compris abandonnées : chaque réponse compte). */
export function computeProgress(records: readonly ReadingRecord[], settings?: ReadingSettings): ReadingProgress {
  return computeProgressFor(realProgram(), records, settings);
}
