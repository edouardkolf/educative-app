// CONTRAT — routes (navigation par hash : compatible GitHub Pages, bouton retour Android, Capacitor).
export type Route =
  | { name: 'profiles' }
  | { name: 'map' }
  | { name: 'play'; levelId: string }
  | { name: 'locked' }
  /** Espace parent : `path` = segments après "#/parent", interprétés par le module parent. */
  | { name: 'parent'; path: string[] };

export function parseHash(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, ...rest] = segments;
  switch (head) {
    case 'map':
      return { name: 'map' };
    case 'play':
      return rest[0] ? { name: 'play', levelId: rest[0] } : { name: 'map' };
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
    case 'map':
      return '#/map';
    case 'play':
      return `#/play/${encodeURIComponent(route.levelId)}`;
    case 'locked':
      return '#/locked';
    case 'parent':
      return ['#/parent', ...route.path.map(encodeURIComponent)].join('/');
  }
}

/** `replace: true` n'ajoute pas d'entrée dans l'historique (retour Android). */
export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const hash = toHash(route);
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}
