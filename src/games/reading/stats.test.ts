import { describe, expect, it } from 'vitest';
import type { ReadingRecord } from '../../storage/readings';
import { alertsFrom, confusionsFrom, itemLabel, summarizeReading } from './stats';
import type { ReadingAnswer } from './types';

const NOW = Date.UTC(2026, 10, 10, 12);
const DAY = 24 * 60 * 60 * 1000;
const id = (s: string) => s.toUpperCase();

function ans(over: Partial<ReadingAnswer> = {}): ReadingAnswer {
  return {
    itemId: 'g:m',
    game: 'letter-sound',
    target: 'm',
    correct: true,
    chosen: null,
    choiceCount: 3,
    replays: 0,
    hinted: false,
    retry: false,
    ms: 1000,
    at: NOW - DAY,
    ...over,
  };
}
const wrong = (over: Partial<ReadingAnswer> = {}) => ans({ correct: false, chosen: 'n', ...over });

/** n réponses dont `ok` justes. */
function batch(n: number, ok: number, over: Partial<ReadingAnswer> = {}): ReadingAnswer[] {
  return Array.from({ length: n }, (_, i) => (i < ok ? ans(over) : wrong(over)));
}

describe('table des confusions', () => {
  it('compte demandé → choisi, les plus fréquentes d’abord', () => {
    const c = confusionsFrom([wrong(), wrong(), wrong({ target: 'f', chosen: 'v' }), ans()], id);
    expect(c).toEqual([
      { target: 'M', chosen: 'N', count: 2 },
      { target: 'F', chosen: 'V', count: 1 },
    ]);
  });

  it('ignore les réponses retry', () => {
    expect(confusionsFrom([wrong({ retry: true }), wrong({ retry: true })], id)).toEqual([]);
  });

  it('ignore les choix qui ne sont ni lettre ni syllabe', () => {
    const c = confusionsFrom(
      [
        wrong({ game: 'same-start', target: 'lapin', chosen: 'moto' }),
        wrong({ game: 'mystery-word', target: 'moto', chosen: 'lapin' }),
        wrong({ game: 'syllable-drum', target: '2', chosen: '3' }),
      ],
      id,
    );
    expect(c).toEqual([]);
  });

  it('traite les syllabes de la machine à syllabes', () => {
    const c = confusionsFrom([wrong({ game: 'syllable-machine', itemId: 'k:blend', target: 'la', chosen: 'lo' })], id);
    expect(c).toEqual([{ target: 'LA', chosen: 'LO', count: 1 }]);
  });

  it('garde 8 confusions au plus', () => {
    const many = 'abcdefghijkl'.split('').map((l) => wrong({ target: l, chosen: 'z' }));
    expect(confusionsFrom(many, id)).toHaveLength(8);
  });
});

describe('alertes « à accompagner »', () => {
  it('se déclenche à 12 réponses et un taux ≤ hasard + 15 points', () => {
    // 3 choix : hasard 1/3 ; seuil 0,4833 ; 5 justes sur 12 = 0,4167 → alerte.
    const a = alertsFrom(batch(12, 5), NOW);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ game: 'letter-sound', answers: 12, label: 'La lettre qui chante' });
    expect(a[0]?.chance).toBeCloseTo(1 / 3);
    expect(a[0]?.rate).toBeCloseTo(5 / 12);
  });

  it('ne se déclenche pas à 11 réponses', () => {
    expect(alertsFrom(batch(11, 0), NOW)).toEqual([]);
  });

  it('borne du taux : 2 choix, 6 sur 12 = 0,5 + 0,15 → 0,65 ; 7/12 alerte, 8/12 non', () => {
    expect(alertsFrom(batch(12, 7, { choiceCount: 2 }), NOW)).toHaveLength(1);
    expect(alertsFrom(batch(12, 8, { choiceCount: 2 }), NOW)).toEqual([]);
  });

  it('borne exacte : taux = hasard + 15 points compte (20 réponses, 2 choix, 13 justes = 0,65)', () => {
    expect(alertsFrom(batch(20, 13, { choiceCount: 2 }), NOW)).toHaveLength(1);
    expect(alertsFrom(batch(20, 14, { choiceCount: 2 }), NOW)).toEqual([]);
  });

  it('la fenêtre est de 14 jours', () => {
    expect(alertsFrom(batch(12, 0, { at: NOW - 14 * DAY }), NOW)).toHaveLength(1);
    expect(alertsFrom(batch(12, 0, { at: NOW - 14 * DAY - 1 }), NOW)).toEqual([]);
  });

  it('les réponses retry ne comptent pas', () => {
    const answers = [...batch(11, 0), ...batch(5, 0, { retry: true })];
    expect(alertsFrom(answers, NOW)).toEqual([]);
  });

  it('le tambour compte pour 3 choix', () => {
    const a = alertsFrom(batch(12, 4, { game: 'syllable-drum', itemId: 'k:count', target: 'lapin', choiceCount: 0 }), NOW);
    expect(a).toHaveLength(1);
    expect(a[0]?.chance).toBeCloseTo(1 / 3);
  });

  it('hasard = moyenne de 1 / choiceCount', () => {
    const mixed = [...batch(6, 0, { choiceCount: 2 }), ...batch(6, 0, { choiceCount: 3 })];
    expect(alertsFrom(mixed, NOW)[0]?.chance).toBeCloseTo((6 / 2 + 6 / 3) / 12);
  });

  it('un bon taux ne déclenche rien, et chaque jeu est jugé séparément', () => {
    const answers = [...batch(12, 12), ...batch(12, 2, { game: 'first-sound', itemId: 'g:l', target: 'l' })];
    expect(alertsFrom(answers, NOW).map((a) => a.game)).toEqual(['first-sound']);
  });
});

describe('libellés parent', () => {
  it('nomme les compétences', () => {
    expect(itemLabel('k:count')).toBe('Compter les syllabes');
    expect(itemLabel('k:onset')).toBe('Commence pareil');
    expect(itemLabel('k:rhyme')).toBe('Rimes');
    expect(itemLabel('k:blend')).toBe('Assembler une syllabe');
    expect(itemLabel('k:blend-stop')).toBe('Assembler avec P, T, B…');
    expect(itemLabel('k:read')).toBe('Lire un mot');
    expect(itemLabel('k:case')).toBe('Majuscule et minuscule');
  });
});

describe('summarizeReading (avec progression et contenu)', () => {
  it('sans séance : étape 1, rien d’acquis, items jamais vus', () => {
    const s = summarizeReading([], undefined, NOW);
    expect(s.stage).toBe(1);
    expect(s.acquired).toBe(0);
    expect(s.gatedTotal).toBeGreaterThan(0);
    expect(s.sessionsCompleted).toBe(0);
    expect(s.items.every((i) => i.state === 'new' && i.rate === null)).toBe(true);
    expect(s.items.find((i) => i.itemId === 'g:m')?.label).toBe('M');
    expect(s.items.find((i) => i.itemId === 'g:ou')?.label).toBe('OU');
  });

  it('taux par item, séances terminées, confusions et alertes', () => {
    const rec: ReadingRecord = {
      id: 'r1',
      profileId: 'p',
      startedAt: NOW - DAY,
      endedAt: NOW - DAY + 1000,
      status: 'completed',
      endReason: null,
      activeMs: 1000,
      stage: 2,
      planned: 12,
      newItemId: null,
      demos: [],
      review: false,
      answers: [
        ...batch(12, 3, { itemId: 'g:a', target: 'a', chosen: 'o' }),
        ans({ itemId: 'g:a', target: 'a', retry: true, correct: false, chosen: 'o' }),
      ],
    } as ReadingRecord;
    const s = summarizeReading([rec], undefined, NOW);
    const a = s.items.find((i) => i.itemId === 'g:a');
    expect(a?.seen).toBe(12);
    expect(a?.rate).toBeCloseTo(3 / 12);
    expect(s.sessionsCompleted).toBe(1);
    expect(s.confusions[0]).toMatchObject({ target: 'A', chosen: 'O', count: 9 });
    expect(s.alerts.map((x) => x.game)).toEqual(['letter-sound']);
  });

  it('startStage fait avancer l’étape en cours', () => {
    expect(summarizeReading([], { startStage: 3 }, NOW).stage).toBe(3);
  });
});
