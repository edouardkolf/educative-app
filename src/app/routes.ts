// CONTRAT — routes (navigation par hash : compatible GitHub Pages, bouton retour Android, Capacitor).
// Voir docs/specs/HUB.md §4.1 : hub, jeux hors parcours, et retour par l'historique (`returnTo`).
export type Route =
  | { name: 'profiles' }
  | { name: 'hub' }
  | { name: 'map' }
  | { name: 'play'; levelId: string }
  | { name: 'dictation' }
  | { name: 'coloring' }
  | { name: 'locked' }
  /** Espace parent : `path` = segments après "#/parent", interprétés par le module parent. */
  | { name: 'parent'; path: string[] };

/** Jeux hors parcours : une route du même nom par jeu (registre : src/games/index.ts). */
export const GAME_ROUTES = ['dictation', 'coloring'] as const;
export type GameRouteName = (typeof GAME_ROUTES)[number];

export function isGameRoute(name: string): name is GameRouteName {
  return (GAME_ROUTES as readonly string[]).includes(name);
}

/** Écrans de l'enfant : un profil actif est exigé et le temps de jeu y est compté. */
export function isChildRoute(name: Route['name']): boolean {
  return name === 'hub' || name === 'map' || name === 'play' || isGameRoute(name);
}

/** Écrans où le verrou (minuteur, quota) laisse finir l'unité en cours : une fin douce (ARCHITECTURE §8). */
export function isSoftEndRoute(name: Route['name']): boolean {
  return name === 'play' || isGameRoute(name);
}

export function parseHash(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, ...rest] = segments;
  switch (head) {
    case 'hub':
      return { name: 'hub' };
    case 'map':
      return { name: 'map' };
    case 'play':
      return rest[0] ? { name: 'play', levelId: rest[0] } : { name: 'map' };
    case 'dictation':
      return { name: 'dictation' };
    case 'coloring':
      return { name: 'coloring' };
    case 'locked':
      return { name: 'locked' };
    case 'parent':
      return { name: 'parent', path: rest };
    default:
      return { name: 'profiles' };
  }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'profiles':
      return '#/';
    case 'hub':
      return '#/hub';
    case 'map':
      return '#/map';
    case 'play':
      return `#/play/${encodeURIComponent(route.levelId)}`;
    case 'dictation':
      return '#/dictation';
    case 'coloring':
      return '#/coloring';
    case 'locked':
      return '#/locked';
    case 'parent':
      return ['#/parent', ...route.path.map(encodeURIComponent)].join('/');
  }
}

// ---------- Profondeur d'historique et écrans-ancres (HUB.md §2.4 et §4.1) ----------
// Chaque entrée d'historique porte `history.state = { depth }` (null si inconnue : hash tapé à la
// main, tests). « Maison » remonte jusqu'à l'ancre (hub ou profils) au lieu d'empiler une entrée :
// ainsi le retour Android ne rouvre jamais la partie ou le jeu restés dessous.

export type HistoryAnchor = 'profiles' | 'hub';

interface HistoryState {
  depth: number | null;
}

/** Profondeur de l'entrée d'historique où chaque ancre a été vue pour la dernière fois (mémoire de module). */
const anchors: Partial<Record<HistoryAnchor, number>> = {};

function currentDepth(): number | null {
  const state = history.state as Partial<HistoryState> | null;
  return typeof state?.depth === 'number' ? state.depth : null;
}

/** Au premier rendu de l'app : l'entrée courante prend la profondeur 0 si elle n'en a pas encore. */
export function ensureHistoryDepth(): void {
  if (currentDepth() === null) history.replaceState({ depth: 0 } satisfies HistoryState, '');
}

/** `replace: true` n'ajoute pas d'entrée dans l'historique (retour Android). */
export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const hash = toHash(route);
  const depth = currentDepth();
  if (opts.replace) {
    history.replaceState({ depth } satisfies HistoryState, '', hash);
  } else {
    if (location.hash === hash) return;
    history.pushState({ depth: depth === null ? null : depth + 1 } satisfies HistoryState, '', hash);
  }
  // pushState/replaceState ne déclenchent pas hashchange : on le signale nous-mêmes (AppShell l'écoute).
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Au montage de l'écran profils et du hub : retient où revenir. Les profils ouvrent une nouvelle séance d'enfant. */
export function markHistoryAnchor(anchor: HistoryAnchor): void {
  const depth = currentDepth();
  if (anchor === 'profiles') delete anchors.hub;
  if (depth === null) delete anchors[anchor];
  else anchors[anchor] = depth;
}

/**
 * Maison, avatar du hub, minutes accordées sur l'écran de fin : remonte l'historique jusqu'à l'ancre
 * si sa profondeur est connue et plus basse que l'entrée courante ; sinon remplace l'entrée courante.
 * On ne saute jamais vers une entrée incertaine.
 */
export function returnTo(anchor: HistoryAnchor): void {
  const target = anchors[anchor];
  const depth = currentDepth();
  if (target !== undefined && depth !== null && target < depth) {
    history.go(target - depth);
    return;
  }
  navigate({ name: anchor }, { replace: true });
}
