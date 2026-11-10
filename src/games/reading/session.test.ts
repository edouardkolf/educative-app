import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { allItems, gamesForItem, getGrapheme, stageItems } from './curriculum';
import { getPicture, isDrumAmbiguous, onsetKey } from './pictures';
import { NEAR_DECOY_MIN_SEEN, SESSION_MAX_QUESTIONS, SESSION_MIN_QUESTIONS, planSession, requeueAfterMiss, vowelClass } from './session';
import { soundText } from './speech';
import type { ItemId, ItemProgress, ItemState, ReadingGameId, ReadingProgress, ReadingQuestion, ReadingStage } from './types';
import { READING_STAGES } from './types';

function item(state: ItemState, seen = 0, lastSeenAt: number | null = null): ItemProgress {
  const correct = Math.round(seen * 0.7);
  return { state, seen, correct, streak: state === 'acquired' ? 3 : 0, missStreak: 0, streakDays: [], lastSeenAt };
}

/** Progression écrite à la main : étapes avant `stage` acquises, `learning` en cours, le reste neuf. */
function progressAt(stage: ReadingStage, learning: ItemId[] = [], opts: { finished?: boolean; demos?: ReadingGameId[]; seen?: number } = {}): ReadingProgress {
  const items: Record<string, ItemProgress> = {};
  let t = 1000;
  for (const s of READING_STAGES) {
    for (const i of stageItems(s)) {
      t += 10;
      if (opts.finished || s < stage) items[i] = item('acquired', opts.seen ?? 12, t);
      else items[i] = item(learning.includes(i) ? 'learning' : 'new', learning.includes(i) ? (opts.seen ?? 5) : 0, learning.includes(i) ? t : null);
    }
  }
  return { stage, finished: opts.finished ?? false, items, demosDone: opts.demos ?? [], sessionsCompleted: 0 };
}

const STATES: { name: string; progress: ReadingProgress }[] = [
  { name: 'vierge', progress: progressAt(1) },
  { name: 'étape 1, count en cours', progress: progressAt(1, ['k:count']) },
  { name: 'étape 1, deux en cours', progress: progressAt(1, ['k:count', 'k:onset']) },
  { name: 'étape 2 vierge', progress: progressAt(2) },
  { name: 'étape 2, a et i en cours', progress: progressAt(2, ['g:a', 'g:i']) },
  { name: 'étape 2, a en cours', progress: progressAt(2, ['g:a']) },
  { name: 'étape 3 vierge', progress: progressAt(3) },
  { name: 'étape 3 avancée', progress: progressAt(3, ['g:l', 'k:blend'], { seen: 9 }) },
  { name: 'étape 3, m en cours', progress: progressAt(3, ['g:m']) },
  { name: 'étape 4 vierge', progress: progressAt(4) },
  { name: 'étape 4, blend-stop en cours', progress: progressAt(4, ['g:p', 'k:blend-stop'], { seen: 6 }) },
  { name: 'étape 5 vierge (startStage 5)', progress: progressAt(5) },
  { name: 'étape 5 en cours', progress: progressAt(5, ['k:read'], { seen: 12 }) },
  { name: 'programme fini', progress: progressAt(5, [], { finished: true }) },
  { name: 'démos faites', progress: progressAt(3, ['g:l'], { demos: ['letter-sound', 'first-sound', 'syllable-drum'] }) },
];

function choiceIds(q: ReadingQuestion): string[] {
  return q.choices.map((c) => c.id);
}

function check(plan: ReturnType<typeof planSession>, progress: ReadingProgress, label: string, review = false): void {
  const qs = plan.questions;
  expect(qs.length, label).toBeGreaterThanOrEqual(SESSION_MIN_QUESTIONS);
  expect(qs.length, label).toBeLessThanOrEqual(SESSION_MAX_QUESTIONS);
  const news = qs.filter((q) => q.isNew);
  expect(news.length, `${label} : items nouveaux`).toBeLessThanOrEqual(1);
  if (plan.newItemId) expect(news[0]?.itemId, label).toBe(plan.newItemId);
  else expect(news.length, label).toBe(0);
  const itemsOf = new Set(qs.map((q) => q.itemId));
  const newItems = [...itemsOf].filter((i) => progress.items[i]?.state === 'new');
  // Exception §5.4 : la toute première séance (rien en cours ni acquis) mêle deux items neufs de l'étape.
  const blank = Object.values(progress.items).every((p) => p.state === 'new');
  if (!review) {
    expect(newItems.filter((i) => i !== plan.newItemId).length, `${label} : items neufs ${newItems.join(',')}`).toBeLessThanOrEqual(blank ? 1 : 0);
  }
  if (!review && blank) {
    let run = 1;
    for (let i = 1; i < qs.length; i += 1) {
      run = qs[i]?.game === qs[i - 1]?.game ? run + 1 : 1;
      expect(run, `${label} : même jeu d'affilée`).toBeLessThanOrEqual(3);
    }
  }

  for (const q of qs) {
    expect(gamesForItem(q.itemId), `${label} : jeu ${q.game} pour ${q.itemId}`).toContain(q.game);
    if (q.game === 'syllable-drum') {
      expect(q.choices).toHaveLength(0);
      expect(['1', '2', '3']).toContain(q.answer);
      const pic = getPicture(q.target);
      expect(pic, q.target).toBeDefined();
      expect(isDrumAmbiguous(pic!), q.target).toBe(false);
      expect(String(pic!.syllables.length)).toBe(q.answer);
      continue;
    }
    const ids = choiceIds(q);
    expect(new Set(ids).size, `${label} : ids uniques ${ids}`).toBe(ids.length);
    expect(ids, `${label} : réponse parmi les choix`).toContain(q.answer);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(ids.length).toBeLessThanOrEqual(3);
    if (q.game === 'mystery-word') {
      expect(q.prompt).toEqual([]);
      expect(ids).toHaveLength(3);
    } else {
      expect(q.prompt.length, `${label} ${q.game}`).toBeGreaterThan(0);
    }
    if (q.game === 'letter-sound' || q.game === 'first-sound') {
      const seen = progress.items[q.itemId]?.seen ?? 0;
      expect(ids.length, `${label} : choix ${q.game}`).toBe(q.isNew || seen < 2 ? 2 : 3);
      for (const id of ids) {
        expect(getGrapheme(id), id).toBeDefined();
        if (id !== q.answer) expect(soundText(id), `${id} sonne comme ${q.answer}`).not.toBe(soundText(q.answer));
        expect(q.choices.find((c) => c.id === id)?.kind).toBe('letter');
      }
      expect(q.target).toBe(q.answer);
      if (q.game === 'letter-sound') expect(q.stimulus.kind).toBe('sound');
      if (q.game === 'first-sound') {
        expect(q.stimulus.kind).toBe('picture');
        if (q.stimulus.kind === 'picture') expect(getPicture(q.stimulus.picture)?.firstSound).toBe(q.answer);
      }
    }
    if (q.game === 'same-start' || q.game === 'same-end') {
      expect(q.speakChoices).toBe(true);
      expect(q.choices.every((c) => c.speech && c.picture), label).toBe(true);
      const model = getPicture(q.target)!;
      const answer = getPicture(q.answer)!;
      if (q.game === 'same-start') {
        expect(answer.syllables[0]).toBe(model.syllables[0]);
        for (const id of ids.filter((i) => i !== q.answer)) {
          const d = getPicture(id)!;
          // même premier son toléré (leurre proche) seulement si la voyelle de la syllabe sonne autrement
          if (onsetKey(d) === onsetKey(model)) {
            expect(vowelClass(d.syllables[0]!), `${model.word} / ${id}`).not.toBe(vowelClass(model.syllables[0]!));
          }
          expect(d.syllables[0], `${model.word} / ${id}`).not.toBe(model.syllables[0]);
        }
      } else {
        expect(answer.rhyme).toBe(model.rhyme);
        for (const id of ids.filter((i) => i !== q.answer)) expect(getPicture(id)!.rhyme, `${model.word} / ${id}`).not.toBe(model.rhyme);
      }
    }
    if (q.game === 'syllable-machine') {
      expect(q.stimulus.kind).toBe('syllable');
      expect(q.target).toBe(q.answer);
      expect(q.choices.every((c) => c.kind === 'syllable' && c.label === c.id.toUpperCase())).toBe(true);
    }
    if (q.game === 'letter-twins') {
      expect(q.choices.every((c) => c.kind === 'lower')).toBe(true);
      const seen = progress.items[q.itemId]?.seen ?? 0;
      if (seen < 20) {
        const pair = ({ b: 'd', d: 'b', p: 'q', q: 'p' } as Record<string, string>)[q.answer];
        if (pair) expect(ids, `${label} : jumelles confusables`).not.toContain(pair);
      }
    }
  }

  // Jamais deux fois la même cible hors item nouveau.
  const seenTargets = new Set<string>();
  for (const q of qs) {
    // Une étape à 5 items (révision des voyelles) ne fournit pas 8 cibles distinctes : un graphème y revient une fois.
    if (q.itemId === plan.newItemId || review) continue;
    const key = `${q.itemId}|${q.target}`;
    expect(seenTargets.has(key), `${label} : cible répétée ${key}`).toBe(false);
    seenTargets.add(key);
  }
  // Démos : jeux de la séance absents de demosDone, sans doublon, dans l'ordre d'apparition.
  const expectedDemos = [...new Set(qs.map((q) => q.game))].filter((g) => !progress.demosDone.includes(g));
  expect(plan.demos, label).toEqual(expectedDemos);
}

function maxRun(qs: readonly ReadingQuestion[]): number {
  let best = 0;
  let run = 0;
  qs.forEach((q, i) => {
    run = i > 0 && qs[i - 1]?.game === q.game ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

describe('planSession', () => {
  for (const { name, progress } of STATES) {
    it(`${name} : 200 graines, jamais d'exception, règles §5.4 et §4`, () => {
      for (let seed = 1; seed <= 200; seed += 1) {
        const plan = planSession(progress, createRng(seed));
        check(plan, progress, `${name} #${seed}`);
        expect(plan.stage).toBe(progress.finished ? 5 : progress.stage);
        // Deux fois le même jeu de questions seulement pour la toute première séance (rien d'autre à poser).
        if (plan.questions.some((q) => q.itemId !== plan.newItemId) || plan.newItemId === null) {
          expect(maxRun(plan.questions), `${name} #${seed} : série du même jeu`).toBeLessThanOrEqual(3);
        }
      }
    });
  }

  it('séances de révision de chaque étape : items de cette étape, aucun item nouveau', () => {
    const prog = progressAt(5, [], { finished: true });
    for (const stage of READING_STAGES) {
      for (let seed = 1; seed <= 50; seed += 1) {
        const plan = planSession(prog, createRng(seed), { stage });
        check(plan, prog, `révision ${stage} #${seed}`, true);
        expect(plan.stage).toBe(stage);
        expect(plan.newItemId).toBeNull();
        const allowed = new Set(stageItems(stage));
        for (const q of plan.questions) expect(allowed.has(q.itemId), `${q.itemId} hors étape ${stage}`).toBe(true);
      }
    }
  });

  it('révision d\'une étape sur une progression vierge : ne lève pas', () => {
    for (const stage of READING_STAGES) {
      for (let seed = 1; seed <= 20; seed += 1) check(planSession(progressAt(1), createRng(seed), { stage }), progressAt(1), `vierge rév ${stage}`, true);
    }
  });

  it('déterministe pour une graine', () => {
    for (const { progress } of STATES) {
      expect(planSession(progress, createRng(42))).toEqual(planSession(progress, createRng(42)));
    }
    const a = planSession(progressAt(3, ['g:l']), createRng(1));
    const b = planSession(progressAt(3, ['g:l']), createRng(2));
    expect(a).not.toEqual(b);
  });

  it('introduit un item nouveau seulement si au plus 1 item de l\'étape est en cours', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      expect(planSession(progressAt(2, ['g:a', 'g:i']), createRng(seed)).newItemId).toBeNull();
      expect(planSession(progressAt(2, ['g:a']), createRng(seed)).newItemId).toBe('g:i');
      expect(planSession(progressAt(2), createRng(seed)).newItemId).toBe('g:a');
      expect(planSession(progressAt(1), createRng(seed)).newItemId).toBe('k:count');
    }
  });

  it('l\'item nouveau : 3 questions (présentation en tête), pas deux de suite hors présentation', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const plan = planSession(progressAt(3, ['g:l']), createRng(seed));
      expect(plan.newItemId).toBe('g:r');
      const idx = plan.questions.map((q, i) => (q.itemId === 'g:r' ? i : -1)).filter((i) => i >= 0);
      expect(idx).toHaveLength(3);
      expect(plan.questions[idx[0]!]?.isNew).toBe(true);
      expect(plan.questions[idx[0]!]?.game).toBe('letter-sound');
      expect(idx[2]! - idx[1]!, `#${seed} : ${idx}`).toBeGreaterThan(1);
    }
  });

  it('la présentation d\'une lettre : son, pause, « comme », mot repère, puis la consigne', () => {
    const plan = planSession(progressAt(3, ['g:l'], { seen: 8 }), createRng(7));
    const q = plan.questions.find((x) => x.isNew)!;
    expect(q.itemId).toBe('g:r');
    expect(q.prompt[0]).toEqual({ text: 'reu', rate: 0.8 });
    expect(q.prompt.some((s) => 'text' in s && s.text === 'comme')).toBe(true);
    expect(q.prompt.some((s) => 'text' in s && s.text === 'robot')).toBe(true);
    expect(q.prompt.some((s) => 'text' in s && s.text === 'Touche la lettre qui chante.')).toBe(true);
    expect(q.choices).toHaveLength(2);
  });

  it('~60 % en cours, ~40 % de révision : les items acquis de toutes les étapes reviennent', () => {
    let review = 0;
    for (let seed = 1; seed <= 50; seed += 1) {
      const plan = planSession(progressAt(3, ['g:l', 'k:blend'], { seen: 8 }), createRng(seed));
      for (const q of plan.questions) if (stageItems(1).includes(q.itemId) || stageItems(2).includes(q.itemId)) review += 1;
    }
    expect(review, 'révision d\'étapes précédentes').toBeGreaterThan(50);
  });

  it('pas de leurre proche avant 4 réponses ; au-delà, un leurre proche s\'il est introduit', () => {
    const near: Record<string, string> = { m: 'n', n: 'm', f: 'v', v: 'f', s: 'z', z: 's' };
    for (let seed = 1; seed <= 100; seed += 1) {
      const young = planSession(progressAt(3, ['g:m'], { seen: 2 }), createRng(seed));
      for (const q of young.questions) {
        if (q.game !== 'letter-sound' || q.target !== 'm') continue;
        expect(choiceIds(q), `#${seed}`).not.toContain('n');
      }
    }
    // 'n' est introduit et 'm' vu 12 fois : au moins une fois sur plusieurs graines, n sert de leurre.
    const prog = progressAt(3, ['g:m', 'g:n'], { seen: 12 });
    let withNear = 0;
    let asked = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const q = planSession(prog, createRng(seed)).questions.find((x) => x.game === 'letter-sound' && x.target === 'm');
      if (q) {
        asked += 1;
        if (choiceIds(q).includes(near.m!)) withNear += 1;
      }
    }
    expect(asked).toBeGreaterThan(20);
    expect(withNear).toBe(asked);
    expect(NEAR_DECOY_MIN_SEEN).toBe(4);
  });

  it('les leurres sont des graphèmes introduits quand il y en a assez', () => {
    const prog = progressAt(3, ['g:l', 'g:r', 'g:f'], { seen: 8 });
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const q of planSession(prog, createRng(seed)).questions) {
        if (q.game !== 'letter-sound' && q.game !== 'first-sound') continue;
        for (const id of choiceIds(q)) {
          if (q.isNew && id === q.target) continue;
          expect(prog.items[`g:${id}`]?.state, `leurre ${id} de ${q.target}`).not.toBe('new');
        }
      }
    }
  });

  it('première séance de lettres : 2 choix, complétés par les suivants dans l\'ordre', () => {
    const prog = progressAt(2);
    for (let seed = 1; seed <= 30; seed += 1) {
      const plan = planSession(prog, createRng(seed));
      const q = plan.questions.find((x) => x.isNew)!;
      expect(q.target).toBe('a');
      expect(choiceIds(q).sort()).toEqual(['a', 'i']);
    }
  });

  it('k:blend-stop : au moins une question sur deux avec une consonne brève', () => {
    const prog = progressAt(4, ['g:p', 'g:t', 'k:blend-stop'], { seen: 6 });
    // p, t introduits (learning) : les syllabes brèves existent.
    for (let seed = 1; seed <= 100; seed += 1) {
      const qs = planSession(prog, createRng(seed)).questions.filter((q) => q.itemId === 'k:blend-stop');
      if (qs.length === 0) continue;
      const short = qs.filter((q) => /^[ptbdcg]/.test(q.target) && !q.target.startsWith('ch')).length;
      expect(short * 2, `#${seed} : ${qs.map((q) => q.target)}`).toBeGreaterThanOrEqual(qs.length);
    }
  });

  it('k:blend n\'utilise que des consonnes longues', () => {
    const prog = progressAt(3, ['g:l', 'g:r', 'k:blend'], { seen: 6 });
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const q of planSession(prog, createRng(seed)).questions.filter((x) => x.itemId === 'k:blend')) {
        const onset = q.stimulus.kind === 'syllable' ? q.stimulus.parts[0] : '';
        expect(['L', 'R', 'F', 'M', 'S', 'J', 'V', 'N', 'Z'], q.target).toContain(onset);
      }
    }
  });

  it('une progression sans clés ni démos ne fait pas lever', () => {
    const bare: ReadingProgress = { stage: 3, finished: false, items: {}, demosDone: [], sessionsCompleted: 0 };
    for (let seed = 1; seed <= 20; seed += 1) {
      const plan = planSession(bare, createRng(seed));
      expect(plan.questions.length).toBeGreaterThanOrEqual(SESSION_MIN_QUESTIONS);
    }
    // tous les items existent
    expect(allItems().length).toBe(38);
  });
});

describe('requeueAfterMiss', () => {
  const plan = planSession(progressAt(3, ['g:l']), createRng(5));

  it('repose la question 2 à 4 places plus loin, ou en dernier, une seule fois', () => {
    const queue = plan.questions.slice();
    for (const index of [0, 1, 2, 5, queue.length - 1]) {
      const fresh = planSession(progressAt(3, ['g:l']), createRng(100 + index)).questions;
      const next = requeueAfterMiss(fresh, index);
      expect(next).toHaveLength(fresh.length + 1);
      const missed = fresh[index]!;
      const again = next.map((q, i) => (q === missed ? i : -1)).filter((i) => i >= 0);
      expect(again).toHaveLength(2);
      expect(again[0]).toBe(index);
      const gap = again[1]! - again[0]!;
      if (again[1] === next.length - 1) expect(gap).toBeGreaterThanOrEqual(1);
      else {
        expect(gap).toBeGreaterThanOrEqual(2);
        expect(gap).toBeLessThanOrEqual(4);
      }
      // une seule fois : la copie ratée de nouveau ne rajoute rien
      expect(requeueAfterMiss(next, again[1]!)).toHaveLength(next.length);
      expect(requeueAfterMiss(next, index)).toHaveLength(next.length);
    }
  });

  it('indice invalide : file inchangée, sans exception', () => {
    const q = plan.questions.slice();
    expect(requeueAfterMiss(q, 99)).toEqual(q);
    expect(requeueAfterMiss(q, -1)).toEqual(q);
  });
});
