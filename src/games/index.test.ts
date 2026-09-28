// Tests de src/games/index.ts (docs/specs/HUB.md §4.2, §8.1).
import { describe, expect, it } from 'vitest';
import { defaultGameIds, getGame, resolveAvailability, visibleGameIds } from './index';
import type { GameDefinition } from './index';

describe('defaultGameIds', () => {
  it("'ms' donne le coloriage", () => {
    expect(defaultGameIds('ms')).toEqual(['coloring']);
  });

  it("'ce1' donne la dictée", () => {
    expect(defaultGameIds('ce1')).toEqual(['dictation']);
  });

  it('un parcours inconnu se replie sur le premier parcours (ms)', () => {
    expect(defaultGameIds('inconnu')).toEqual(['coloring']);
  });
});

describe('visibleGameIds', () => {
  it('profile.games absent : le défaut du parcours', () => {
    expect(visibleGameIds({ trackId: 'ce1', games: undefined })).toEqual(['dictation']);
    expect(visibleGameIds({ trackId: 'ms', games: undefined })).toEqual(['coloring']);
  });

  it('[] : aucun jeu', () => {
    expect(visibleGameIds({ trackId: 'ce1', games: [] })).toEqual([]);
  });

  it("l'ordre suit le registre, pas celui de `games`", () => {
    expect(visibleGameIds({ trackId: 'ms', games: ['dictation', 'coloring'] })).toEqual(['dictation', 'coloring']);
  });

  it('les ids inconnus et les doublons disparaissent', () => {
    expect(visibleGameIds({ trackId: 'ms', games: ['coloring', 'coloring', 'inconnu'] })).toEqual(['coloring']);
  });
});

describe('getGame', () => {
  it('renvoie la définition connue, undefined sinon', () => {
    expect(getGame('dictation')?.id).toBe('dictation');
    expect(getGame('n-importe-quoi')).toBeUndefined();
  });
});

describe('resolveAvailability', () => {
  const base: Omit<GameDefinition, 'checkAvailability'> = {
    id: 'dictation',
    route: { name: 'dictation' },
    parentLabel: 'Dictée quotidienne',
    tileLabel: 'Dictée',
    defaultTracks: ['ce1'],
    store: 'dictations',
  };

  it('sans checkAvailability : toujours disponible', async () => {
    await expect(resolveAvailability(base)).resolves.toEqual({ available: true });
  });

  it('{ available: false } explicite est respecté', async () => {
    const game: GameDefinition = {
      ...base,
      checkAvailability: async () => ({ available: false, parentHint: 'Le téléphone ne peut pas parler.' }),
    };
    await expect(resolveAvailability(game)).resolves.toEqual({
      available: false,
      parentHint: 'Le téléphone ne peut pas parler.',
    });
  });

  it('un rejet donne { available: true } : le jeu vérifie lui-même', async () => {
    const game: GameDefinition = {
      ...base,
      checkAvailability: async () => {
        throw new Error('boom');
      },
    };
    await expect(resolveAvailability(game)).resolves.toEqual({ available: true });
  });

  it('un délai dépassé donne { available: true }', async () => {
    const game: GameDefinition = {
      ...base,
      checkAvailability: () => new Promise(() => {}), // ne se résout jamais
    };
    await expect(resolveAvailability(game, 5)).resolves.toEqual({ available: true });
  });
});
