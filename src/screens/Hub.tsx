// Écran hub (docs/specs/HUB.md §2.1) : avatar (→ profils), anneau de temps, tuile carte et tuiles de
// jeu. Aucun texte visible : seulement des aria-label, pour une enfant de 4 ans non lectrice.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Route } from '../app/routes';
import { markHistoryAnchor, navigate, returnTo } from '../app/routes';
import { useProfile } from '../app/context';
import { useSession } from '../app/SessionProvider';
import { getGame, resolveAvailability, visibleGameIds } from '../games';
import { playTap } from '../ui/sound';
import { Emoji } from '../ui/Emoji';
import { Icon } from '../ui/icons/Icon';
import { GameIcon } from '../ui/icons/GameIcon';
import { TimeRing } from '../ui/TimeRing';
import { WorldBackdrop } from './map/WorldBackdrop';
import { worldIdAt } from './map/layout';
import { HubTile } from './hub/HubTile';
import './hub/hub.css';

type TileState = 'ready' | 'checking' | 'unavailable';

export function Hub() {
  const { profile } = useProfile();
  const { remainingRatio } = useSession();
  const [states, setStates] = useState<Record<string, TileState>>({});
  const leavingRef = useRef(false);

  // Retient l'entrée d'historique du hub : la maison de la carte et des jeux y remonte sans empiler
  // (HUB.md §2.4, §4.1).
  useEffect(() => {
    markHistoryAnchor('hub');
  }, []);

  const gameIds = profile ? visibleGameIds(profile) : [];
  // La liste ne change qu'avec le profil ou les jeux visibles : une chaîne stable évite de relancer
  // les vérifications de disponibilité à chaque rendu.
  const gameIdsKey = gameIds.join(',');

  // Chaque montage relance la vérification de disponibilité (§2.1) : au plus 2 s, jamais bloquante.
  useEffect(() => {
    leavingRef.current = false;
    if (!profile) return undefined;
    let cancelled = false;
    const ids = gameIdsKey ? gameIdsKey.split(',') : [];
    setStates((cur) => {
      const next: Record<string, TileState> = {};
      ids.forEach((id) => { next[id] = cur[id] ?? 'checking'; });
      return next;
    });
    ids.forEach((id) => {
      const game = getGame(id);
      if (!game) return;
      resolveAvailability(game).then((result) => {
        if (cancelled) return;
        setStates((cur) => ({ ...cur, [id]: result.available ? 'ready' : 'unavailable' }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, gameIdsKey]);

  if (!profile) return null;

  const goTo = (route: Route) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    playTap();
    navigate(route);
  };

  const world = worldIdAt(profile.seenWorld ?? 0);
  const count = 1 + gameIds.length;

  return (
    <div class="hub" data-testid="hub">
      <button
        type="button"
        class="hub-avatar"
        data-testid="hub-to-profiles"
        aria-label="Retour aux profils"
        onClick={() => returnTo('profiles')}
      >
        <Emoji char={profile.avatar} />
      </button>
      {remainingRatio !== null && <TimeRing ratio={remainingRatio} />}
      <div class="hub-tiles" data-count={count}>
        <HubTile
          testId="hub-tile-map"
          ariaLabel="Carte"
          world={world}
          onClick={() => goTo({ name: 'map' })}
          style={{ '--enter-delay': '0ms' }}
        >
          <span class="hub-tile__backdrop" aria-hidden="true">
            <WorldBackdrop world={world} veil="soft" />
          </span>
          <Icon name="map" size={112} class="hub-tile__icon" />
        </HubTile>
        {gameIds.map((id, i) => {
          const game = getGame(id);
          if (!game) return null;
          const state: TileState = states[id] ?? (game.checkAvailability ? 'checking' : 'ready');
          return (
            <HubTile
              key={id}
              testId={`hub-tile-${id}`}
              ariaLabel={game.tileLabel}
              state={state}
              class={`hub-tile--${id}`}
              onClick={() => goTo(game.route)}
              style={{ '--enter-delay': `${(i + 1) * 90}ms` }}
              badge={state === 'unavailable' ? <Icon name="speaker-off" size={40} /> : undefined}
            >
              <GameIcon id={id} size={112} />
            </HubTile>
          );
        })}
      </div>
    </div>
  );
}
