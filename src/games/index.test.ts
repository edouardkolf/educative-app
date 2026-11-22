// Tests de src/games/index.ts (docs/specs/HUB.md §4.2, §8.1).
import { describe, expect, it } from 'vitest';
import { LECTURE_FLAVOR, MALINS_FLAVOR, flavorFor } from '../app/flavor';
import { ALL_GAMES, GAMES, defaultGameIds, gamesForFlavor, getGame, hubGameIds, isAdventureGame, resolveAvailability, visibleGameIds } from './index';
import type { GameDefinition } from './index';

describe('defaultGameIds', () => {
  it("'ms' donne le coloriage, la lecture (juste après) et les jeux de logique", () => {
    expect(defaultGameIds('ms')).toEqual(['coloring', 'reading', 'robot', 'memory', 'order', 'maze']);
  });

  it("'ce1' donne la dictée, le morpion, le pendu et les jeux de logique", () => {
    expect(defaultGameIds('ce1')).toEqual(['dictation', 'tictactoe', 'hangman', 'guess-number', 'code-breaker', 'robot']);
  });

  it('un parcours inconnu se replie sur le premier parcours (ms)', () => {
    expect(defaultGameIds('inconnu')).toEqual(['coloring', 'reading', 'robot', 'memory', 'order', 'maze']);
  });
});

describe('visibleGameIds', () => {
  it('profile.games absent : le défaut du parcours', () => {
    expect(visibleGameIds({ trackId: 'ce1', games: undefined })).toEqual([
      'dictation',
      'tictactoe',
      'hangman',
      'guess-number',
      'code-breaker',
      'robot',
    ]);
    expect(visibleGameIds({ trackId: 'ms', games: undefined })).toEqual([
      'coloring',
      'reading',
      'robot',
      'memory',
      'order',
      'maze',
    ]);
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

describe('variantes (src/app/flavor.ts)', () => {
  it('sans VITE_APP_FLAVOR : Petits Malins, tous les jeux, pas de jeu d’aventure', () => {
    expect(flavorFor(undefined)).toBe(MALINS_FLAVOR);
    expect(GAMES).toBe(ALL_GAMES);
    expect(isAdventureGame('reading')).toBe(false);
    expect(hubGameIds({ trackId: 'ms', games: undefined })).toEqual(visibleGameIds({ trackId: 'ms', games: undefined }));
  });

  it('Petits Lecteurs : la lecture d’abord, puis les mini-jeux de maternelle ; aucun jeu de CE1', () => {
    expect(flavorFor('lecture')).toBe(LECTURE_FLAVOR);
    expect(gamesForFlavor(LECTURE_FLAVOR).map((g) => g.id)).toEqual(['reading', 'coloring', 'memory', 'order', 'maze', 'robot']);
    expect(LECTURE_FLAVOR.dbName).not.toBe(MALINS_FLAVOR.dbName);
  });

  it('Petits Lecteurs : la lecture est toujours visible mais n’est jamais une tuile du hub', () => {
    const f = LECTURE_FLAVOR;
    expect(defaultGameIds('ms', f)).toEqual(['reading', 'coloring', 'memory', 'order', 'maze', 'robot']);
    // Même si le parent a tout décoché (ou une fiche importée de Petits Malins sans la lecture).
    expect(visibleGameIds({ trackId: 'ms', games: [] }, f)).toEqual(['reading']);
    expect(visibleGameIds({ trackId: 'ms', games: ['dictation', 'memory'] }, f)).toEqual(['reading', 'memory']);
    expect(hubGameIds({ trackId: 'ms', games: undefined }, f)).toEqual(['coloring', 'memory', 'order', 'maze', 'robot']);
    expect(isAdventureGame('reading', f)).toBe(true);
  });
});
