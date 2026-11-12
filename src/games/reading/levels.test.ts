import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { ReadingRecord } from '../../storage/readings';
import { gamesForItem, GRAPHEMES } from './curriculum';
import { getLevel, isLevelPass, LEVELS, levelProgress, levelState, passMark, type ReadingLevel } from './levels';
import { computeProgress } from './progress';
import { planLevel } from './session';
import type { ReadingAnswer } from './types';

function answer(correct: boolean, retry = false): ReadingAnswer {
  return {
    itemId: 'k:count',
    game: 'syllable-drum',
    target: 'chat',
    correct,
    chosen: correct ? null : '2',
    choiceCount: 3,
    replays: 0,
    hinted: false,
    retry,
    ms: 1000,
    at: 1000,
  };
}

let seq = 0;
/** Séance d'un niveau avec `right` bonnes réponses sur `planned`. */
function session(levelId: string | undefined, right: number, planned = 5, over: Partial<ReadingRecord> = {}): ReadingRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    profileId: 'p1',
    status: 'completed',
    startedAt: seq * 1000,
    endedAt: seq * 1000 + 500,
    activeMs: 500,
    stage: 1,
    planned,
    newItemId: null,
    demos: [],
    answers: Array.from({ length: planned }, (_, i) => answer(i < right)),
    review: false,
    ...(levelId ? { levelId } : {}),
    ...over,
  } as ReadingRecord;
}

const level = (n: number): ReadingLevel => LEVELS[n - 1] as ReadingLevel;

describe('parcours de niveaux : structure', () => {
  it('commence par le tambour, la première lettre arrive au niveau 2, et les pistes alternent', () => {
    expect(LEVELS.slice(0, 10).map((l) => l.id)).toEqual([
      'drum-1',
      'sound-a',
      'drum-2',
      'first-a',
      'start-1',
      'sound-i',
      'start-2',
      'first-i',
      'end-1',
      'sound-o',
    ]);
    // Jusqu'à la dernière lettre du programme, un niveau sur deux est un niveau « lettres ».
    const lastLetter = LEVELS.findIndex((l) => l.id === 'sound-g');
    for (let i = 0; i <= lastLetter + 1; i += 1) {
      expect(LEVELS[i]?.track === 'letters', `niveau ${i + 1}`).toBe(i % 2 === 1);
    }
  });

  it('identifiants uniques, rangs continus, un jeu compatible avec l’item', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    LEVELS.forEach((l, i) => {
      expect(l.index).toBe(i + 1);
      expect(gamesForItem(l.item), l.id).toContain(l.game);
      expect(getLevel(l.id)).toBe(l);
    });
  });

  it('chaque lettre du programme a son niveau « son », et « son dans un mot » quand elle a des images', () => {
    for (const g of GRAPHEMES.filter((x) => x.gated)) {
      const sound = getLevel(`sound-${g.id}`);
      expect(sound, g.id).toBeDefined();
      expect(sound?.known).toContain(g.id);
      const first = getLevel(`first-${g.id}`);
      expect(Boolean(first), g.id).toBe(gamesForItem(`g:${g.id}`).includes('first-sound'));
      if (first) expect(first.index).toBeGreaterThan(sound!.index);
    }
    // Les lettres connues ne font que s'ajouter au fil du parcours.
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.known.slice(0, LEVELS[i - 1]!.known.length)).toEqual(LEVELS[i - 1]!.known);
    }
  });

  it('la machine à syllabes n’arrive qu’après L et R, les mots à lire qu’après toutes les lettres', () => {
    for (const l of LEVELS) {
      if (l.game === 'syllable-machine') expect(l.known).toEqual(expect.arrayContaining(['l', 'r']));
      if (l.game === 'mystery-word') expect(l.known.length).toBeGreaterThanOrEqual(23);
      if (l.item === 'k:blend-stop') expect(l.known).toContain('p');
    }
    expect(LEVELS.some((l) => l.game === 'syllable-machine')).toBe(true);
    expect(LEVELS.some((l) => l.game === 'letter-twins')).toBe(true);
  });

  it('séances courtes aux étapes 1 et 2 (5 questions), 8 ensuite', () => {
    for (const l of LEVELS) expect(l.questions, l.id).toBe(l.stage <= 2 ? 5 : 8);
    expect(passMark(5)).toBe(4);
    expect(passMark(8)).toBe(6);
  });
});

describe('parcours de niveaux : déblocage', () => {
  it('sans séance : niveau 1 en cours, le reste verrouillé', () => {
    const p = levelProgress([]);
    expect(p.current?.id).toBe('drum-1');
    expect(levelState(p, level(1))).toBe('current');
    expect(levelState(p, level(2))).toBe('locked');
    expect(p.finished).toBe(false);
  });

  it('4 sur 5 gagne le niveau et ouvre le suivant ; 3 sur 5 le laisse à rejouer', () => {
    const lost = levelProgress([session('drum-1', 3)]);
    expect(lost.current?.id).toBe('drum-1');
    expect(lost.attempts['drum-1']).toBe(1);
    const won = levelProgress([session('drum-1', 3), session('drum-1', 4)]);
    expect(won.passed.has('drum-1')).toBe(true);
    expect(won.current?.id).toBe('sound-a');
    expect(levelState(won, level(1))).toBe('done');
    expect(levelState(won, level(3))).toBe('locked');
  });

  it('un niveau gagné le reste, même rejoué et raté ensuite', () => {
    const p = levelProgress([session('drum-1', 5), session('drum-1', 1, 5, { review: true })]);
    expect(p.passed.has('drum-1')).toBe(true);
  });

  it('ne comptent pas : séance abandonnée, séance incomplète, réponses reposées, séance sans niveau, niveau inconnu', () => {
    expect(isLevelPass(session('drum-1', 5, 5, { status: 'abandoned' }))).toBe(false);
    const short = session('drum-1', 4);
    short.answers = short.answers.slice(0, 4);
    expect(isLevelPass(short)).toBe(false);
    const retried = session('drum-1', 3);
    retried.answers.push(answer(true, true), answer(true, true));
    expect(isLevelPass(retried)).toBe(false);
    const p = levelProgress([session(undefined, 5), session('niveau-disparu', 5), session('drum-1', 5, 5, { status: 'abandoned' })]);
    expect(p.current?.id).toBe('drum-1');
  });

  it('6 sur 8 gagne un niveau long, 5 sur 8 non', () => {
    expect(isLevelPass(session('sound-l', 6, 8))).toBe(true);
    expect(isLevelPass(session('sound-l', 5, 8))).toBe(false);
  });

  it('étape de départ : les niveaux des étapes d’avant sont tenus pour gagnés', () => {
    const p2 = levelProgress([], { startStage: 2 });
    expect(p2.current?.id).toBe('sound-a');
    const p3 = levelProgress([], { startStage: 3 });
    expect(p3.current?.stage).toBe(3);
    expect(LEVELS.filter((l) => l.stage < 3).every((l) => p3.passed.has(l.id))).toBe(true);
  });

  it('tout gagné : parcours fini', () => {
    const p = levelProgress(LEVELS.map((l) => session(l.id, l.questions, l.questions)));
    expect(p.finished).toBe(true);
    expect(p.current).toBeNull();
  });
});

describe('planLevel : une séance = un niveau = un seul jeu', () => {
  const blank = computeProgress([]);

  it('pour chaque niveau et 20 graines : bon nombre de questions, un seul jeu, réponse parmi les choix', () => {
    for (const l of LEVELS) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const plan = planLevel(l, blank, createRng(seed * 7919 + l.index));
        const label = `${l.id} graine ${seed}`;
        expect(plan.levelId, label).toBe(l.id);
        expect(plan.stage, label).toBe(l.stage);
        expect(plan.questions.length, label).toBe(l.questions);
        for (const q of plan.questions) {
          expect(q.game, label).toBe(l.game);
          if (q.game === 'syllable-drum') {
            expect(['1', '2', '3'], label).toContain(q.answer);
          } else {
            const ids = q.choices.map((c) => c.id);
            expect(ids, label).toContain(q.answer);
            expect(new Set(ids).size, label).toBe(ids.length);
            expect(ids.length, label).toBeGreaterThanOrEqual(2);
          }
        }
        expect(plan.demos, label).toEqual([l.game]);
      }
    }
  });

  it('niveau « son » : la lettre du niveau est présentée en premier et domine la séance', () => {
    const plan = planLevel(getLevel('sound-o')!, blank, createRng(3));
    expect(plan.questions[0]?.isNew).toBe(true);
    expect(plan.questions[0]?.target).toBe('o');
    expect(plan.newItemId).toBe('g:o');
    expect(plan.questions.filter((q) => q.target === 'o').length).toBe(3);
    // Le reste révise des lettres déjà vues, jamais une lettre à venir.
    for (const q of plan.questions) expect(['a', 'i', 'o']).toContain(q.target);
  });

  it('première lettre : tout le niveau porte sur A', () => {
    const plan = planLevel(getLevel('sound-a')!, blank, createRng(5));
    expect(plan.questions.every((q) => q.target === 'a')).toBe(true);
  });

  it('niveau « son dans un mot » : images différentes, lettres déjà vues seulement', () => {
    const plan = planLevel(getLevel('first-i')!, blank, createRng(11));
    const pics = plan.questions.map((q) => (q.stimulus.kind === 'picture' ? q.stimulus.picture : ''));
    expect(new Set(pics).size).toBe(pics.length);
    for (const q of plan.questions) expect(['a', 'i']).toContain(q.target);
    expect(plan.questions.some((q) => q.target === 'i')).toBe(true);
  });

  it('machine à syllabes : seulement des lettres déjà présentées', () => {
    const l = LEVELS.find((x) => x.game === 'syllable-machine')!;
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const q of planLevel(l, blank, createRng(seed)).questions) {
        if (q.stimulus.kind !== 'syllable') throw new Error('stimulus inattendu');
        for (const part of q.stimulus.parts) expect(l.known, `${q.target}`).toContain(part.toLowerCase());
      }
    }
  });

  it('la démonstration n’est demandée que pour un jeu jamais montré', () => {
    const seen = computeProgress([session('drum-1', 5, 5, { demos: ['syllable-drum'] })]);
    expect(planLevel(getLevel('drum-2')!, seen, createRng(1)).demos).toEqual([]);
    expect(planLevel(getLevel('sound-a')!, seen, createRng(1)).demos).toEqual(['letter-sound']);
  });
});
