import { describe, expect, it } from 'vitest';
import type { Run } from '../storage';
import { MIN_ROUNDS_FOR_VERDICT, summarizeByGroup, summarizeRuns } from './stats';

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

describe('summarizeByGroup', () => {
  const third = 1 / 3;
  const levels = [
    { levelId: 'seq-1', group: 'patterns', completed: true, chance: third },
    { levelId: 'seq-2', group: 'patterns', completed: false, chance: third },
    { levelId: 'count-1', group: 'counting', completed: true, chance: third },
    { levelId: 'odd-1', group: 'visual-discrimination', completed: false, chance: 0.25 },
    { levelId: 'mix-1', group: 'color-mixing', completed: false, chance: 0 },
    { levelId: 'sort-1', group: 'categorization', completed: false, chance: 0.5 },
  ];

  it('regroupe les manches et compte les niveaux réussis', () => {
    const result = summarizeByGroup([run(rounds(6, 5), 'seq-1'), run(rounds(6, 4), 'seq-2')], levels);
    const patterns = result.find((g) => g.group === 'patterns')!;
    expect(patterns).toMatchObject({ levels: 2, levelsCompleted: 1, roundsPlayed: 12 });
    expect(patterns.firstTryRate).toBeCloseTo(9 / 12);
    expect(patterns.chanceRate).toBeCloseTo(third);
  });

  it('corrige du hasard : 65 % sur un jeu à 2 choix vaut moins que 65 % sur un jeu à 3', () => {
    const result = summarizeByGroup([run(rounds(20, 13), 'sort-1'), run(rounds(20, 13), 'count-1')], levels);
    const sort = result.find((g) => g.group === 'categorization')!;
    const count = result.find((g) => g.group === 'counting')!;
    expect(sort.firstTryRate).toBe(count.firstTryRate);
    expect(sort.score).toBeCloseTo(0.3); // (0,65 − 0,5) / 0,5
    expect(count.score).toBeCloseTo(0.475); // (0,65 − 1/3) / (2/3)
    expect(sort.verdict).toBe('weak');
    expect(count.verdict).toBe('ok');
  });

  it('pondère le hasard par les manches jouées sur chaque niveau', () => {
    const mixed = [
      { levelId: 'a', group: 'g', completed: false, chance: 0.5 },
      { levelId: 'b', group: 'g', completed: false, chance: 0.25 },
    ];
    const [g] = summarizeByGroup([run(rounds(3, 0), 'a'), run(rounds(1, 0), 'b')], mixed);
    expect(g!.chanceRate).toBeCloseTo((3 * 0.5 + 0.25) / 4);
  });

  it('classe du mieux au moins bien réussi, puis les peu joués, puis les jamais joués', () => {
    const result = summarizeByGroup(
      [
        run(rounds(10, 5), 'seq-1'), // score 0,25 → à consolider
        run(rounds(10, 9), 'count-1'), // score 0,85 → point fort
        run(rounds(3, 3), 'odd-1'), // sans faute mais trop peu de manches
        run(rounds(12, 8), 'mix-1'), // hasard nul : score 0,67 → en cours
      ],
      levels,
    );
    expect(result.map((g) => [g.group, g.verdict])).toEqual([
      ['counting', 'strong'],
      ['color-mixing', 'ok'],
      ['patterns', 'weak'],
      ['visual-discrimination', 'too-few'],
      ['categorization', 'not-played'],
    ]);
  });

  it('ne conclut pas sous le seuil de manches', () => {
    const [g] = summarizeByGroup([run(rounds(MIN_ROUNDS_FOR_VERDICT - 1, 0), 'count-1')], [levels[2]!]);
    expect(g!.verdict).toBe('too-few');
  });

  it('donne le temps médian, insensible à une manche où l’enfant a décroché', () => {
    const r = [...rounds(4, 4, 2000), { index: 4, taps: 1, firstTry: true, durationMs: 120_000 }];
    const [g] = summarizeByGroup([run(r, 'count-1')], [levels[2]!]);
    expect(g!.medianRoundMs).toBe(2000);
  });

  it('ignore les parties de niveaux hors du parcours', () => {
    const [g] = summarizeByGroup([run(rounds(20, 0), 'autre-niveau')], [levels[2]!]);
    expect(g!.roundsPlayed).toBe(0);
    expect(g!.firstTryRate).toBeNull();
    expect(g!.score).toBeNull();
    expect(g!.medianRoundMs).toBeNull();
  });
});
