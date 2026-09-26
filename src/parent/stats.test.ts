import { describe, expect, it } from 'vitest';
import type { Run } from '../storage';
import { MIN_ROUNDS_FOR_VERDICT, summarizeBySkill, summarizeRuns } from './stats';

function run(rounds: Run['rounds'], levelId = 'l'): Run {
  return {
    id: 'r',
    profileId: 'p',
    levelId,
    trackId: 't',
    startedAt: 0,
    endedAt: 1,
    status: 'completed',
    endReason: null,
    replay: false,
    rounds,
    stars: 3,
  };
}

describe('summarizeRuns', () => {
  it('renvoie des zéros et un taux nul sans partie', () => {
    expect(summarizeRuns([])).toEqual({ totalRuns: 0, firstTryRate: null, playTimeMs: 0 });
  });

  it('cumule le temps de jeu et le taux de réussite au premier coup toutes parties confondues', () => {
    const runs = [
      run([
        { index: 0, taps: 1, firstTry: true, durationMs: 1000 },
        { index: 1, taps: 2, firstTry: false, durationMs: 2000 },
      ]),
      run([{ index: 0, taps: 1, firstTry: true, durationMs: 500 }]),
    ];

    const summary = summarizeRuns(runs);

    expect(summary.totalRuns).toBe(2);
    expect(summary.playTimeMs).toBe(3500);
    expect(summary.firstTryRate).toBeCloseTo(2 / 3);
  });
});

/** `n` manches dont `ok` réussies du premier coup, chacune de `ms` millisecondes. */
function rounds(n: number, ok: number, ms = 1000): Run['rounds'] {
  return Array.from({ length: n }, (_, index) => ({
    index,
    taps: index < ok ? 1 : 2,
    firstTry: index < ok,
    durationMs: ms,
  }));
}

describe('summarizeBySkill', () => {
  const levels = [
    { levelId: 'seq-1', skill: 'patterns' as const, completed: true },
    { levelId: 'seq-2', skill: 'patterns' as const, completed: false },
    { levelId: 'count-1', skill: 'counting' as const, completed: true },
    { levelId: 'odd-1', skill: 'visual-discrimination' as const, completed: false },
    { levelId: 'mix-1', skill: 'color-mixing' as const, completed: false },
    { levelId: 'sort-1', skill: 'categorization' as const, completed: false },
  ];

  it('regroupe les manches par compétence et compte les niveaux réussis', () => {
    const result = summarizeBySkill([run(rounds(6, 5), 'seq-1'), run(rounds(6, 4), 'seq-2')], levels);
    const patterns = result.find((s) => s.skill === 'patterns')!;
    expect(patterns).toMatchObject({ levels: 2, levelsCompleted: 1, roundsPlayed: 12 });
    expect(patterns.firstTryRate).toBeCloseTo(9 / 12);
    expect(patterns.verdict).toBe('ok');
  });

  it('classe de la mieux à la moins bien réussie, puis les peu jouées, puis les jamais jouées', () => {
    const result = summarizeBySkill(
      [
        run(rounds(10, 5), 'seq-1'), // 50 % → à consolider
        run(rounds(10, 9), 'count-1'), // 90 % → point fort
        run(rounds(3, 3), 'odd-1'), // 100 % mais trop peu de manches
        run(rounds(12, 8), 'mix-1'), // 67 % → en cours
      ],
      levels,
    );
    expect(result.map((s) => [s.skill, s.verdict])).toEqual([
      ['counting', 'strong'],
      ['color-mixing', 'ok'],
      ['patterns', 'weak'],
      ['visual-discrimination', 'too-few'],
      ['categorization', 'not-played'],
    ]);
  });

  it('ne conclut pas sous le seuil de manches', () => {
    const [skill] = summarizeBySkill([run(rounds(MIN_ROUNDS_FOR_VERDICT - 1, 0), 'count-1')], [levels[2]!]);
    expect(skill!.verdict).toBe('too-few');
  });

  it('donne le temps médian, insensible à une manche où l’enfant a décroché', () => {
    const r = [...rounds(4, 4, 2000), { index: 4, taps: 1, firstTry: true, durationMs: 120_000 }];
    const [skill] = summarizeBySkill([run(r, 'count-1')], [levels[2]!]);
    expect(skill!.medianRoundMs).toBe(2000);
  });

  it('ignore les parties de niveaux hors du parcours', () => {
    const [skill] = summarizeBySkill([run(rounds(20, 0), 'autre-niveau')], [levels[2]!]);
    expect(skill!.roundsPlayed).toBe(0);
    expect(skill!.firstTryRate).toBeNull();
    expect(skill!.medianRoundMs).toBeNull();
  });
});
