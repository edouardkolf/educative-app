import { describe, expect, it } from 'vitest';
import { computeLevelStates, hasCompleted } from './progress';
import type { LevelOverride, Run } from '../storage/types';
import type { Track } from './types';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return { id: 'test-track', title: 'Parcours de test', levels: ['l1', 'l2', 'l3'], ...overrides };
}

let runSeq = 0;
function makeRun(partial: Partial<Run> & Pick<Run, 'levelId'>): Run {
  runSeq += 1;
  return {
    id: `run-${runSeq}`,
    profileId: 'p1',
    trackId: 'test-track',
    startedAt: runSeq,
    endedAt: runSeq + 1,
    status: 'completed',
    endReason: null,
    replay: false,
    rounds: [],
    stars: 3,
    ...partial,
  };
}

function override(levelId: string, state: LevelOverride['state']): LevelOverride {
  return { profileId: 'p1', levelId, state };
}

describe('computeLevelStates', () => {
  it('sans partie : seul le premier niveau est débloqué et courant', () => {
    const states = computeLevelStates(makeTrack(), [], []);
    expect(states.map((s) => [s.levelId, s.status, s.bestStars, s.current, s.overridden])).toEqual([
      ['l1', 'unlocked', 0, true, false],
      ['l2', 'locked', 0, false, false],
      ['l3', 'locked', 0, false, false],
    ]);
  });

  it('respecte minStarsToUnlockNext : pas assez d’étoiles ne débloque pas le suivant', () => {
    const track = makeTrack({ minStarsToUnlockNext: 2 });
    const runs = [makeRun({ levelId: 'l1', stars: 1 })];
    const states = computeLevelStates(track, runs, []);
    expect(states[0]).toMatchObject({ levelId: 'l1', status: 'completed', bestStars: 1 });
    expect(states[1]).toMatchObject({ levelId: 'l2', status: 'locked', bestStars: 0, current: false });
    expect(states.some((s) => s.current)).toBe(false);
  });

  it('débloque le niveau suivant une fois le seuil atteint', () => {
    const track = makeTrack({ minStarsToUnlockNext: 2 });
    const runs = [makeRun({ levelId: 'l1', stars: 2 })];
    const states = computeLevelStates(track, runs, []);
    expect(states[0]).toMatchObject({ status: 'completed', bestStars: 2 });
    expect(states[1]).toMatchObject({ levelId: 'l2', status: 'unlocked', current: true });
    expect(states[2]).toMatchObject({ levelId: 'l3', status: 'locked', current: false });
  });

  it('déblocage en chaîne sur plusieurs niveaux (seuil par défaut = 1 étoile)', () => {
    const track = makeTrack();
    const runs = [makeRun({ levelId: 'l1', stars: 3 }), makeRun({ levelId: 'l2', stars: 1 })];
    const states = computeLevelStates(track, runs, []);
    expect(states.map((s) => s.status)).toEqual(['completed', 'completed', 'unlocked']);
    expect(states.find((s) => s.current)?.levelId).toBe('l3');
  });

  it('un niveau déjà réussi reste "completed" même si le précédent n’a plus assez d’étoiles', () => {
    const track = makeTrack({ minStarsToUnlockNext: 2 });
    // l1 n'a qu'1 étoile (n'ouvrirait plus l2 sous ce seuil), mais l2 a déjà été réussi par le passé.
    const runs = [makeRun({ levelId: 'l1', stars: 1 }), makeRun({ levelId: 'l2', stars: 3 })];
    const states = computeLevelStates(track, runs, []);
    expect(states[1]).toMatchObject({ levelId: 'l2', status: 'completed', bestStars: 3 });
  });

  it('override "locked" verrouille et conserve bestStars', () => {
    const track = makeTrack();
    const runs = [makeRun({ levelId: 'l1', stars: 3 })];
    const states = computeLevelStates(track, runs, [override('l1', 'locked')]);
    expect(states[0]).toMatchObject({ status: 'locked', bestStars: 3, overridden: true });
  });

  it('override "unlocked" donne "completed" si bestStars >= 1, sinon "unlocked"', () => {
    const track = makeTrack({ minStarsToUnlockNext: 2 });
    const runs = [makeRun({ levelId: 'l1', stars: 1 })]; // l2 normalement verrouillé

    const withoutStars = computeLevelStates(track, runs, [override('l2', 'unlocked')]);
    expect(withoutStars[1]).toMatchObject({ status: 'unlocked', bestStars: 0, overridden: true });

    const withStars = computeLevelStates(
      track,
      [...runs, makeRun({ levelId: 'l2', stars: 2 })],
      [override('l2', 'unlocked')],
    );
    expect(withStars[1]).toMatchObject({ status: 'completed', bestStars: 2, overridden: true });
  });

  it('overridden reste faux quand aucun réglage parent ne s’applique', () => {
    const states = computeLevelStates(makeTrack(), [], []);
    expect(states.every((s) => s.overridden === false)).toBe(true);
  });
});

describe('hasCompleted', () => {
  it('vrai si une partie du niveau est terminée', () => {
    const runs = [makeRun({ levelId: 'l1', status: 'completed' })];
    expect(hasCompleted('l1', runs)).toBe(true);
  });

  it('faux si seules des parties en cours ou abandonnées existent', () => {
    const runs = [
      makeRun({ levelId: 'l1', status: 'in_progress', stars: 0 }),
      makeRun({ levelId: 'l1', status: 'abandoned', stars: 0, endReason: 'quit' }),
    ];
    expect(hasCompleted('l1', runs)).toBe(false);
  });

  it('faux si aucune partie sur ce niveau', () => {
    expect(hasCompleted('l1', [])).toBe(false);
  });
});
