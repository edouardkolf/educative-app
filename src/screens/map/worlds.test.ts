import { describe, expect, it } from 'vitest';
import type { LevelState } from '../../engine/types';
import { LEVELS_PER_WORLD } from './layout';
import { pendingWorldEntry, reachedWorldIndex } from './worlds';

/** `done` niveaux réussis, le suivant en cours, le reste verrouillé. */
function statesAt(done: number, count = LEVELS_PER_WORLD * 2 + 2): LevelState[] {
  return Array.from({ length: count }, (_, i) => ({
    levelId: `l${i}`,
    status: i < done ? 'completed' : i === done ? 'unlocked' : 'locked',
    bestStars: i < done ? 3 : 0,
    current: i === done,
    overridden: false,
  }));
}

describe('reachedWorldIndex', () => {
  it('suit le niveau en cours', () => {
    expect(reachedWorldIndex(statesAt(0))).toBe(0);
    expect(reachedWorldIndex(statesAt(LEVELS_PER_WORLD - 1))).toBe(0);
    expect(reachedWorldIndex(statesAt(LEVELS_PER_WORLD))).toBe(1);
  });

  it('tout réussi : monde du dernier niveau', () => {
    const count = LEVELS_PER_WORLD + 3;
    expect(reachedWorldIndex(statesAt(count, count))).toBe(1);
  });
});

describe('pendingWorldEntry', () => {
  it('fête l’arrivée dans un nouveau monde, avec le trajet depuis le dernier niveau du précédent', () => {
    expect(pendingWorldEntry(statesAt(LEVELS_PER_WORLD), 0)).toEqual({
      worldIndex: 1,
      fromIndex: LEVELS_PER_WORLD - 1,
      toIndex: LEVELS_PER_WORLD,
    });
  });

  it('rien si le monde est déjà vu, ou pas encore calibré', () => {
    expect(pendingWorldEntry(statesAt(LEVELS_PER_WORLD), 1)).toBeNull();
    expect(pendingWorldEntry(statesAt(LEVELS_PER_WORLD + 3), 1)).toBeNull();
    expect(pendingWorldEntry(statesAt(LEVELS_PER_WORLD), undefined)).toBeNull();
    expect(pendingWorldEntry(statesAt(3), 0)).toBeNull();
  });

  it('rien quand tout le parcours est réussi (pas de niveau en cours)', () => {
    const count = LEVELS_PER_WORLD + 3;
    expect(pendingWorldEntry(statesAt(count, count), 0)).toBeNull();
  });
});
