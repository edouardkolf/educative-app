// Tests de la maîtrise et de la progression (LECTURE.md §5.1 à 5.3). Le cœur est testé avec un programme fictif.
import { describe, expect, it } from 'vitest';
import type { ReadingRecord } from '../../storage/readings';
import { allItems, gatedItems, stageItems } from './curriculum';
import { computeProgress, computeProgressFor, dayOf } from './progress';
import type { ReadingProgram } from './progress';
import type { ItemId, ItemProgress, ReadingAnswer, ReadingProgress, ReadingStage } from './types';

const STAGES: Record<number, { items: ItemId[]; gated: ItemId[] }> = {
  1: { items: ['k:count'], gated: ['k:count'] },
  2: { items: ['g:a', 'g:i'], gated: ['g:a', 'g:i'] },
  3: { items: ['g:l'], gated: ['g:l'] },
  4: { items: [], gated: [] },
  5: { items: ['k:read', 'g:k'], gated: ['k:read'] },
};
const PROGRAM: ReadingProgram = {
  items: Object.values(STAGES).flatMap((s) => s.items),
  stageItems: (stage) => STAGES[stage]?.items ?? [],
  gatedItems: (stage) => STAGES[stage]?.gated ?? [],
};

function item(p: ReadingProgress, id: string): ItemProgress {
  const found = p.items[id];
  if (!found) throw new Error(`item absent : ${id}`);
  return found;
}

/** Instant local : jour `day` de janvier 2026, à l'heure `hour`. */
const t = (day: number, hour = 10, minute = 0): number => new Date(2026, 0, day, hour, minute).getTime();

function answer(itemId: ItemId, correct: boolean, at: number, retry = false): ReadingAnswer {
  return {
    itemId,
    game: itemId.startsWith('k:') ? 'same-start' : 'letter-sound',
    target: 'x',
    correct,
    chosen: correct ? null : 'z',
    choiceCount: 3,
    replays: 0,
    hinted: false,
    retry,
    ms: 1000,
    at,
  };
}

let counter = 0;
function record(
  answers: ReadingAnswer[],
  opts: { stage?: ReadingStage; status?: 'completed' | 'abandoned'; review?: boolean; demos?: ReadingRecord['demos'] } = {},
): ReadingRecord {
  counter += 1;
  const startedAt = answers.length > 0 ? Math.min(...answers.map((a) => a.at)) : counter;
  const endedAt = answers.length > 0 ? Math.max(...answers.map((a) => a.at)) + 1000 : startedAt;
  return {
    id: `r${counter}`,
    profileId: 'p',
    startedAt,
    endedAt,
    status: opts.status ?? 'completed',
    endReason: opts.status === 'abandoned' ? 'quit' : null,
    activeMs: 1000,
    stage: opts.stage ?? 2,
    planned: Math.max(1, answers.length),
    newItemId: null,
    demos: opts.demos ?? [],
    answers,
    review: opts.review ?? false,
  };
}

const run = (records: ReadingRecord[], startStage?: ReadingStage) =>
  computeProgressFor(PROGRAM, records, startStage ? { startStage } : undefined);

describe('dayOf', () => {
  it('donne le jour local AAAA-MM-JJ', () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
    expect(dayOf(new Date(2026, 11, 31, 0, 0).getTime())).toBe('2026-12-31');
  });
});

describe('graphème (§5.1)', () => {
  it('contient tous les items, y compris jamais vus', () => {
    const p = run([]);
    expect(Object.keys(p.items).sort()).toEqual([...PROGRAM.items].sort());
    expect(item(p, 'g:a')).toEqual({
      state: 'new',
      seen: 0,
      correct: 0,
      streak: 0,
      missStreak: 0,
      streakDays: [],
      lastSeenAt: null,
    });
    expect(p.stage).toBe(1);
    expect(p.finished).toBe(false);
  });

  it('passe de new à learning à la première réponse, même fausse', () => {
    const p = run([record([answer('g:a', false, t(1))])]);
    expect(item(p, 'g:a').state).toBe('learning');
    expect(item(p, 'g:a').seen).toBe(1);
    expect(item(p, 'g:a').lastSeenAt).toBe(t(1));
  });

  it('3 bonnes le même jour : pas acquis', () => {
    const p = run([record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11)), answer('g:a', true, t(1, 12))])]);
    expect(item(p, 'g:a').state).toBe('learning');
    expect(item(p, 'g:a').streak).toBe(3);
    expect(item(p, 'g:a').streakDays).toEqual(['2026-01-01']);
  });

  it('2 bonnes le même jour puis 1 le lendemain : acquis', () => {
    const p = run([
      record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11))]),
      record([answer('g:a', true, t(2))]),
    ]);
    expect(item(p, 'g:a').state).toBe('acquired');
    expect(item(p, 'g:a').streakDays).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('3 bonnes le même jour puis une 4e le lendemain : acquis', () => {
    const p = run([
      record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11)), answer('g:a', true, t(1, 12))]),
      record([answer('g:a', true, t(2))]),
    ]);
    expect(item(p, 'g:a').state).toBe('acquired');
  });

  it('une erreur remet la série et les jours à zéro', () => {
    const p = run([
      record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11)), answer('g:a', false, t(1, 12))]),
      record([answer('g:a', true, t(2)), answer('g:a', true, t(2, 11))]),
    ]);
    expect(item(p, 'g:a').state).toBe('learning');
    expect(item(p, 'g:a').streak).toBe(2);
    expect(item(p, 'g:a').streakDays).toEqual(['2026-01-02']);
  });

  const acquiredAnswers = () => [
    answer('g:a', true, t(1)),
    answer('g:a', true, t(1, 11)),
    answer('g:a', true, t(2)),
  ];

  it('perd l\'acquis après 2 erreurs d\'affilée, série remise à zéro', () => {
    const p = run([record([...acquiredAnswers(), answer('g:a', false, t(3)), answer('g:a', false, t(3, 11))])]);
    expect(item(p, 'g:a').state).toBe('learning');
    expect(item(p, 'g:a').streak).toBe(0);
    expect(item(p, 'g:a').missStreak).toBe(0);
  });

  it('garde l\'acquis après une seule erreur ou deux erreurs séparées', () => {
    const one = run([record([...acquiredAnswers(), answer('g:a', false, t(3))])]);
    expect(item(one, 'g:a').state).toBe('acquired');
    const split = run([
      record([...acquiredAnswers(), answer('g:a', false, t(3)), answer('g:a', true, t(3, 11)), answer('g:a', false, t(3, 12))]),
    ]);
    expect(item(split, 'g:a').state).toBe('acquired');
  });

  it('reconquiert après une perte : 3 bonnes sur 2 jours', () => {
    const p = run([
      record([...acquiredAnswers(), answer('g:a', false, t(3)), answer('g:a', false, t(3, 11))]),
      record([answer('g:a', true, t(4)), answer('g:a', true, t(4, 11)), answer('g:a', true, t(5))]),
    ]);
    expect(item(p, 'g:a').state).toBe('acquired');
  });
});

describe('compétence (§5.2)', () => {
  const skill = (results: boolean[], days: number[]): ReadingAnswer[] =>
    results.map((ok, i) => answer('k:count', ok, t(days[i] ?? 1, 10, i)));

  it('acquise : 10 réponses, 8 justes, sur 2 jours', () => {
    const p = run([record(skill([true, true, true, true, true, false, true, true, true, false], [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]))]);
    expect(item(p, 'k:count').state).toBe('acquired');
  });

  it('pas acquise avec 9 réponses seulement', () => {
    const p = run([record(skill(Array(9).fill(true), [1, 1, 1, 1, 1, 2, 2, 2, 2]))]);
    expect(item(p, 'k:count').state).toBe('learning');
  });

  it('pas acquise avec 7 justes sur 10', () => {
    const p = run([record(skill([true, true, true, true, true, true, true, false, false, false], [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]))]);
    expect(item(p, 'k:count').state).toBe('learning');
  });

  it('pas acquise si tout tient sur un seul jour', () => {
    const p = run([record(skill(Array(10).fill(true), Array(10).fill(1)))]);
    expect(item(p, 'k:count').state).toBe('learning');
  });

  it('la fenêtre est glissante : 8 sur les 10 dernières suffit malgré un mauvais début', () => {
    const results = [false, false, false, false, true, true, true, true, true, true, true, true];
    const p = run([record(skill(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2]))]);
    expect(item(p, 'k:count').state).toBe('acquired');
  });

  it('retombe à learning à 5 justes ou moins sur les 10 dernières, pas à 6', () => {
    const good = skill([true, true, true, true, true, true, true, true, true, true], [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
    // 5 fausses d'affilée : fenêtre 5 justes -> perdu
    const lost = run([record([...good, ...[false, false, false, false, false].map((ok, i) => answer('k:count', ok, t(3, 10, i)))])]);
    expect(item(lost, 'k:count').state).toBe('learning');
    // 4 fausses : fenêtre 6 justes -> toujours acquis
    const kept = run([record([...good, ...[false, false, false, false].map((ok, i) => answer('k:count', ok, t(3, 10, i)))])]);
    expect(item(kept, 'k:count').state).toBe('acquired');
  });
});

describe('réponses ignorées ou prises en compte', () => {
  it('ignore les réponses retry', () => {
    const p = run([
      record([
        answer('g:a', true, t(1)),
        answer('g:a', false, t(1, 11), true),
        answer('g:a', false, t(1, 12), true),
        answer('g:a', true, t(2)),
        answer('g:a', true, t(2, 11)),
      ]),
    ]);
    expect(item(p, 'g:a').seen).toBe(3);
    expect(item(p, 'g:a').state).toBe('acquired');
  });

  it('ignore un itemId hors programme sans lever', () => {
    const p = run([record([answer('g:zz', true, t(1)), answer('g:a', true, t(1, 11))])]);
    expect(Object.keys(p.items)).not.toContain('g:zz');
    expect(item(p, 'g:a').seen).toBe(1);
  });

  it('rejoue dans l\'ordre de `at`, quel que soit l\'ordre des séances', () => {
    const later = record([answer('g:a', true, t(2))]);
    const earlier = record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11))]);
    const p = run([later, earlier]);
    expect(item(p, 'g:a').state).toBe('acquired');
    expect(item(p, 'g:a').lastSeenAt).toBe(t(2));
  });

  it('compte les séances abandonnées pour les items', () => {
    const p = run([
      record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11))], { status: 'abandoned' }),
      record([answer('g:a', true, t(2))], { status: 'abandoned' }),
    ]);
    expect(item(p, 'g:a').state).toBe('acquired');
    expect(p.sessionsCompleted).toBe(0);
  });

  it('demosDone = union des démos, sessionsCompleted = séances terminées', () => {
    const p = run([
      record([answer('g:a', true, t(1))], { demos: ['letter-sound', 'same-start'] }),
      record([answer('g:a', true, t(2))], { demos: ['same-start', 'syllable-drum'] }),
      record([answer('g:a', true, t(3))], { status: 'abandoned', demos: ['mystery-word'] }),
    ]);
    expect([...p.demosDone].sort()).toEqual(['letter-sound', 'mystery-word', 'same-start', 'syllable-drum']);
    expect(p.sessionsCompleted).toBe(2);
  });
});

describe('étapes (§5.3)', () => {
  /** Séance de l'étape 1 : `n` bonnes réponses sur `k:count` puis `wrong` fausses, au jour donné. */
  const stage1 = (day: number, right: number, wrong: number, opts: Parameters<typeof record>[1] = {}) =>
    record(
      [
        ...Array.from({ length: right }, (_, i) => answer('k:count', true, t(day, 10, i))),
        ...Array.from({ length: wrong }, (_, i) => answer('k:count', false, t(day, 11, i))),
      ],
      { stage: 1, ...opts },
    );

  it('reste à l\'étape 1 sans séance', () => {
    expect(run([]).stage).toBe(1);
  });

  it('valide l\'étape 1 : item acquis et 2 séances terminées à 80 %', () => {
    // J1 : 5 bonnes sur 5 ; J2 : 5 bonnes sur 5 -> 10 réponses, 2 jours, taux 100 %.
    const p = run([stage1(1, 5, 0), stage1(2, 5, 0)]);
    expect(item(p, 'k:count').state).toBe('acquired');
    expect(p.stage).toBe(2);
  });

  it('il faut au moins 2 séances de l\'étape', () => {
    const p = run([stage1(1, 5, 0), stage1(2, 5, 0, { stage: 2 })]);
    expect(p.stage).toBe(1);
    const q = run([record([...Array.from({ length: 10 }, (_, i) => answer('k:count', true, t(1 + (i % 2), 10, i)))], { stage: 1 })]);
    expect(item(q, 'k:count').state).toBe('acquired');
    expect(q.stage).toBe(1);
  });

  it('refuse sous 80 % sur les 2 dernières séances (4/5 + 3/5 = 70 %), accepte à 80 %', () => {
    const low = run([stage1(1, 4, 1), stage1(2, 3, 2), stage1(2, 5, 0, { status: 'abandoned' })]);
    expect(low.stage).toBe(1);
    // 8/10 et 8/10 en regroupant : 4/5 + 4/5 = 80 % exactement
    const edge = run([stage1(1, 5, 0), stage1(2, 4, 1), stage1(3, 4, 1)]);
    expect(item(edge, 'k:count').state).toBe('acquired');
    expect(edge.stage).toBe(2);
  });

  it('ne tient compte que des 2 dernières séances : une mauvaise séance ancienne est rattrapée', () => {
    const p = run([stage1(1, 2, 3), stage1(2, 5, 0), stage1(3, 5, 0)]);
    expect(p.stage).toBe(2);
  });

  it('exclut la révision du taux d\'étape', () => {
    // la séance de révision acquiert l'item mais ne compte pas comme séance de l'étape
    const p = run([stage1(1, 5, 0), stage1(2, 5, 0, { review: true })]);
    expect(item(p, 'k:count').state).toBe('acquired');
    expect(p.stage).toBe(1);
    const q = run([stage1(1, 5, 0), stage1(2, 5, 0, { review: true }), stage1(3, 5, 0)]);
    expect(q.stage).toBe(2);
  });

  it('abandonnées : comptent pour les items, pas pour le taux', () => {
    // item acquis grâce à une séance abandonnée, mais une seule séance terminée
    const p = run([stage1(1, 5, 0, { status: 'abandoned' }), stage1(2, 5, 0)]);
    expect(item(p, 'k:count').state).toBe('acquired');
    expect(p.stage).toBe(1);
    // l'abandonnée ne remplace pas une séance terminée : 2/5 + 5/5 = 70 % reste insuffisant
    const q = run([stage1(1, 2, 3), stage1(2, 5, 0), stage1(3, 5, 0, { status: 'abandoned' })]);
    expect(q.stage).toBe(1);
  });

  it('exige que tous les items bloquants soient acquis', () => {
    // étape 2 : g:a acquis, g:i seulement vu ; deux belles séances ne suffisent pas
    const ses = (day: number) =>
      record(
        [
          answer('g:a', true, t(day, 10, 0)),
          answer('g:a', true, t(day, 10, 1)),
          answer('g:i', true, t(day, 10, 2)),
        ],
        { stage: 2 },
      );
    const p = run([ses(1), ses(2), ses(3)], 2);
    expect(item(p, 'g:a').state).toBe('acquired');
    expect(item(p, 'g:i').state).toBe('acquired'); // 3 bonnes sur 3 jours
    expect(p.stage).toBe(3);
    const q = run([ses(1), ses(1)], 2);
    expect(item(q, 'g:i').state).toBe('learning');
    expect(q.stage).toBe(2);
  });

  it('est monotone : une étape validée le reste si un item est perdu ensuite', () => {
    const p = run([
      stage1(1, 5, 0),
      stage1(2, 5, 0),
      record([answer('k:count', false, t(3, 10, 0)), answer('k:count', false, t(3, 10, 1)), answer('k:count', false, t(3, 10, 2)), answer('k:count', false, t(3, 10, 3)), answer('k:count', false, t(3, 10, 4)), answer('k:count', false, t(3, 10, 5))], { stage: 1 }),
    ]);
    expect(item(p, 'k:count').state).toBe('learning');
    expect(p.stage).toBe(2);
  });

  it('une étape ne se valide pas avant que la précédente le soit', () => {
    const p = run([
      record([answer('g:a', true, t(1)), answer('g:a', true, t(1, 11)), answer('g:a', true, t(2)), answer('g:i', true, t(1, 12)), answer('g:i', true, t(1, 13)), answer('g:i', true, t(2, 11))], { stage: 2 }),
      record([answer('g:a', true, t(3))], { stage: 2 }),
    ]);
    expect(p.stage).toBe(1);
  });

  it('startStage : étapes d\'avant validées, items acquis (mais perdables)', () => {
    const p = run([], 3);
    expect(p.stage).toBe(3);
    expect(item(p, 'k:count').state).toBe('acquired');
    expect(item(p, 'g:a').state).toBe('acquired');
    expect(item(p, 'g:l').state).toBe('new');
    const lost = run([record([answer('g:a', false, t(1)), answer('g:a', false, t(1, 11))], { stage: 3 })], 3);
    expect(item(lost, 'g:a').state).toBe('learning');
    expect(lost.stage).toBe(3);
  });

  it('programme fini : stage 5 et finished', () => {
    const ses = (day: number, hour: number) =>
      record(
        Array.from({ length: 5 }, (_, i) => answer('k:read', true, t(day, hour, i))),
        { stage: 5 },
      );
    const p = run([ses(1, 10), ses(2, 10)], 5);
    expect(item(p, 'k:read').state).toBe('acquired');
    expect(p.finished).toBe(true);
    expect(p.stage).toBe(5);
  });
});

describe('computeProgress avec le vrai contenu', () => {
  const ready = (() => {
    try {
      return allItems().length > 0;
    } catch {
      return false;
    }
  })();

  it.skipIf(!ready)('liste tous les items du programme, à zéro', () => {
    const p = computeProgress([]);
    expect(Object.keys(p.items).sort()).toEqual([...allItems()].sort());
    expect(p.stage).toBe(1);
    expect(p.finished).toBe(false);
    expect(Object.values(p.items).every((i) => i.state === 'new')).toBe(true);
  });

  it.skipIf(!ready)('startStage 3 : les items des étapes 1 et 2 partent acquis', () => {
    const p = computeProgress([], { startStage: 3 });
    expect(p.stage).toBe(3);
    for (const stage of [1, 2] as const) {
      for (const id of stageItems(stage)) expect(item(p, id).state).toBe('acquired');
    }
    for (const id of stageItems(3)) expect(item(p, id).state).toBe('new');
  });

  it.skipIf(!ready)('valide l\'étape 1 avec ses trois compétences', () => {
    const gated = gatedItems(1);
    const mk = (day: number): ReadingRecord =>
      record(
        gated.flatMap((id, g) => Array.from({ length: 5 }, (_, i) => answer(id, true, t(day, 10, g * 5 + i)))),
        { stage: 1 },
      );
    const p = computeProgress([mk(1), mk(2)]);
    for (const id of gated) expect(item(p, id).state).toBe('acquired');
    expect(p.stage).toBe(2);
  });

  it.skipIf(!ready)('tolère un itemId inconnu', () => {
    expect(() => computeProgress([record([answer('g:ñ' as ItemId, true, t(1))])])).not.toThrow();
  });
});
