// Tests de src/app/routes.ts (docs/specs/HUB.md §4.1). `history`, `location` et `window` sont de
// faux objets (vi.stubGlobal) : Vitest tourne en environnement node, sans DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from './routes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FakeHistory = { pushState: any; replaceState: any; go: any; state: unknown };

function stubBrowser(initialHash: string) {
  let hash = initialHash;
  let state: unknown = null;
  const historyMock: FakeHistory = {
    get state() {
      return state;
    },
    pushState: vi.fn((s: unknown, _title: string, url?: string) => {
      state = s;
      if (url !== undefined) hash = url;
    }),
    replaceState: vi.fn((s: unknown, _title: string, url?: string) => {
      state = s;
      if (url !== undefined) hash = url;
    }),
    go: vi.fn(),
  };
  const locationMock = {
    get hash() {
      return hash;
    },
  };
  const dispatched: { type: string }[] = [];
  const windowMock = {
    dispatchEvent: vi.fn((event: { type: string }) => {
      dispatched.push(event);
      return true;
    }),
  };
  class FakeHashChangeEvent {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  }
  vi.stubGlobal('history', historyMock);
  vi.stubGlobal('location', locationMock);
  vi.stubGlobal('window', windowMock);
  vi.stubGlobal('HashChangeEvent', FakeHashChangeEvent);
  return { historyMock, dispatched };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('parseHash / toHash', () => {
  it.each<Route>([
    { name: 'profiles' },
    { name: 'hub' },
    { name: 'map' },
    { name: 'play', levelId: 'ms-01' },
    { name: 'dictation' },
    { name: 'coloring' },
    { name: 'locked' },
    { name: 'parent', path: ['children', 'p1'] },
  ])('aller-retour pour %o', async (route) => {
    const { parseHash, toHash } = await import('./routes');
    expect(parseHash(toHash(route))).toEqual(route);
  });

  it('un hash inconnu mène aux profils', async () => {
    const { parseHash } = await import('./routes');
    expect(parseHash('#/n-importe-quoi')).toEqual({ name: 'profiles' });
    expect(parseHash('')).toEqual({ name: 'profiles' });
  });

  it('#/play sans id renvoie la carte', async () => {
    const { parseHash } = await import('./routes');
    expect(parseHash('#/play')).toEqual({ name: 'map' });
  });
});

describe('prédicats', () => {
  it('isGameRoute', async () => {
    const { isGameRoute } = await import('./routes');
    expect(isGameRoute('dictation')).toBe(true);
    expect(isGameRoute('coloring')).toBe(true);
    expect(isGameRoute('map')).toBe(false);
    expect(isGameRoute('n-importe-quoi')).toBe(false);
  });

  it('isChildRoute : hub, map, play et les jeux ; pas profiles, locked ni parent', async () => {
    const { isChildRoute } = await import('./routes');
    expect(isChildRoute('hub')).toBe(true);
    expect(isChildRoute('map')).toBe(true);
    expect(isChildRoute('play')).toBe(true);
    expect(isChildRoute('dictation')).toBe(true);
    expect(isChildRoute('coloring')).toBe(true);
    expect(isChildRoute('profiles')).toBe(false);
    expect(isChildRoute('locked')).toBe(false);
    expect(isChildRoute('parent')).toBe(false);
  });

  it('isSoftEndRoute : play et les jeux seulement', async () => {
    const { isSoftEndRoute } = await import('./routes');
    expect(isSoftEndRoute('play')).toBe(true);
    expect(isSoftEndRoute('dictation')).toBe(true);
    expect(isSoftEndRoute('coloring')).toBe(true);
    expect(isSoftEndRoute('hub')).toBe(false);
    expect(isSoftEndRoute('map')).toBe(false);
  });
});

describe('navigate, markHistoryAnchor, returnTo', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('ensureHistoryDepth pose depth = 0 si absent, ne touche pas une profondeur déjà connue', async () => {
    const { historyMock } = stubBrowser('#/');
    const { ensureHistoryDepth } = await import('./routes');
    ensureHistoryDepth();
    expect(historyMock.replaceState).toHaveBeenCalledWith({ depth: 0 }, '');
    historyMock.replaceState.mockClear();
    // depth déjà connue (5) : un second appel ne la modifie pas.
    historyMock.replaceState({ depth: 5 }, '');
    historyMock.replaceState.mockClear();
    ensureHistoryDepth();
    expect(historyMock.replaceState).not.toHaveBeenCalled();
  });

  it('navigate en push incrémente la profondeur et déclenche hashchange', async () => {
    const { historyMock, dispatched } = stubBrowser('#/');
    historyMock.replaceState({ depth: 2 }, '');
    const { navigate } = await import('./routes');
    navigate({ name: 'hub' });
    expect(historyMock.pushState).toHaveBeenCalledWith({ depth: 3 }, '', '#/hub');
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.type).toBe('hashchange');
  });

  it('navigate en push vers le hash courant ne fait rien', async () => {
    const { historyMock } = stubBrowser('#/hub');
    const { navigate } = await import('./routes');
    navigate({ name: 'hub' });
    expect(historyMock.pushState).not.toHaveBeenCalled();
  });

  it('navigate en replace garde la profondeur', async () => {
    const { historyMock } = stubBrowser('#/');
    historyMock.replaceState({ depth: 4 }, '');
    const { navigate } = await import('./routes');
    navigate({ name: 'locked' }, { replace: true });
    expect(historyMock.replaceState).toHaveBeenLastCalledWith({ depth: 4 }, '', '#/locked');
  });

  it('depth inconnue (hash tapé à la main) : push garde depth = null', async () => {
    const { historyMock } = stubBrowser('#/');
    // state jamais posé : currentDepth() = null
    const { navigate } = await import('./routes');
    navigate({ name: 'hub' });
    expect(historyMock.pushState).toHaveBeenCalledWith({ depth: null }, '', '#/hub');
  });

  it("returnTo remonte l'historique si l'ancre est connue et plus basse que l'entrée courante", async () => {
    const { historyMock } = stubBrowser('#/');
    const { markHistoryAnchor, navigate, returnTo } = await import('./routes');
    historyMock.replaceState({ depth: 1 }, '');
    markHistoryAnchor('hub'); // ancre hub à la profondeur 1
    navigate({ name: 'coloring' }); // profondeur 2
    returnTo('hub');
    expect(historyMock.go).toHaveBeenCalledWith(-1);
  });

  it('returnTo remplace si la profondeur cible est inconnue', async () => {
    const { historyMock } = stubBrowser('#/');
    const { returnTo } = await import('./routes');
    returnTo('profiles');
    expect(historyMock.go).not.toHaveBeenCalled();
    expect(historyMock.replaceState).toHaveBeenCalledWith({ depth: null }, '', '#/');
  });

  it("markHistoryAnchor('profiles') efface l'ancre hub : une nouvelle séance d'enfant commence", async () => {
    const { historyMock } = stubBrowser('#/');
    const { markHistoryAnchor, navigate, returnTo } = await import('./routes');
    historyMock.replaceState({ depth: 1 }, '');
    markHistoryAnchor('hub');
    navigate({ name: 'coloring' }); // profondeur 2 (un hash différent de l'initial, sinon navigate no-op)
    markHistoryAnchor('profiles');
    navigate({ name: 'hub' }); // profondeur 3
    returnTo('hub'); // l'ancre hub a été oubliée : on remplace au lieu de sauter
    expect(historyMock.go).not.toHaveBeenCalled();
    expect(historyMock.replaceState).toHaveBeenLastCalledWith({ depth: 3 }, '', '#/hub');
  });
});
