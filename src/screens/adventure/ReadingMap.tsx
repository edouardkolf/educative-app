// Carte d'aventure de Petits Lecteurs (docs/specs/LECTURE-APP.md §3) : les niveaux du programme de lecture
// (src/games/reading/levels.ts) posés sur le chemin des mondes de la carte (forêt, mer, montagne, nuages…).
// Même décor et même mise en page que la carte de compétences ; chaque étape est un médaillon de lecture.
// Toucher un niveau ouvre sa séance (`#/reading/<niveau>`) ; la fin de séance ramène ici.
import { useEffect, useRef, useState } from 'preact/hooks';
import { markHistoryAnchor, navigate, returnTo } from '../../app/routes';
import { useProfile } from '../../app/context';
import { useSession } from '../../app/SessionProvider';
import type { LevelState as MapLevelState } from '../../engine/types';
import { getSettings, listReadings, saveProfile } from '../../storage';
import { Emoji } from '../../ui/Emoji';
import { Icon } from '../../ui/icons/Icon';
import { IconButton } from '../../ui/IconButton';
import { TimeRing } from '../../ui/TimeRing';
import { playError, playTap } from '../../ui/sound';
import { checkVoice } from '../../ui/voice';
import { LevelIcon, TRACK_COLORS } from '../../games/reading/LevelIcon';
import { isPlayable, LEVELS, levelProgress, levelState, type LevelState } from '../../games/reading/levels';
import { MapScenery } from '../map/MapScenery';
import { NODE_SIZE, nodePosition, trackHeightFor, worldIdAt, worldIndexForLevel } from '../map/layout';
import { pendingWorldEntry, reachedWorldIndex } from '../map/worlds';
import { WorldBanner } from '../map/WorldBanner';
import '../../games/reading/reading.css';
import './adventure.css';

/** Largeur de repli avant la première mesure (viewport Pixel 7). */
const FALLBACK_WIDTH = 412;

interface Loaded {
  states: readonly LevelState[];
  unlockAll: boolean;
}

/**
 * États au format de la carte de compétences, pour réutiliser la détection d'arrivée dans un monde. Calculés sans
 * le mode admin : ouvrir tous les niveaux ne doit pas déclencher de fête.
 */
export function toMapStates(states: readonly LevelState[]): MapLevelState[] {
  return LEVELS.map((level, i) => {
    const state = states[i] ?? 'locked';
    return {
      levelId: level.id,
      status: state === 'done' ? 'completed' : state === 'current' ? 'unlocked' : 'locked',
      bestStars: 0,
      current: state === 'current',
      overridden: false,
    };
  });
}

export function ReadingMap() {
  const { profile, setProfile } = useProfile();
  const { remainingRatio } = useSession();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [voiceReady, setVoiceReady] = useState(true);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [arrivalWorld, setArrivalWorld] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const leavingRef = useRef(false);
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? FALLBACK_WIDTH : window.innerWidth || FALLBACK_WIDTH,
  );

  // La fin d'une séance revient ici sans empiler d'entrée d'historique (routes.ts, returnTo('map')).
  useEffect(() => {
    markHistoryAnchor('map');
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const update = () => {
      if (el.clientWidth > 0) setWidth(el.clientWidth);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded !== null]);

  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    leavingRef.current = false;
    scrolledRef.current = false;
    (async () => {
      try {
        const [records, settings, voice] = await Promise.all([
          listReadings(profile.id),
          getSettings(),
          checkVoice().catch(() => null),
        ]);
        if (cancelled) return;
        const progress = levelProgress(records, profile.gameSettings?.reading);
        const unlockAll = settings.adminUnlockAll === true;
        const states = LEVELS.map((level) => levelState(progress, level, { unlockAll }));
        const plain = toMapStates(LEVELS.map((level) => levelState(progress, level)));
        setVoiceReady(voice?.status === 'ready');
        setLoaded({ states, unlockAll });
        // Arrivée dans un nouveau monde : le panneau du monde, une fois. Premier passage : calibrage silencieux.
        const entry = pendingWorldEntry(plain, profile.seenWorld);
        setArrivalWorld(entry ? entry.worldIndex : null);
        const reached = reachedWorldIndex(plain);
        if (profile.seenWorld === undefined || reached > profile.seenWorld) {
          saveProfile({ ...profile, seenWorld: reached })
            .then((saved) => {
              if (!cancelled) setProfile((cur) => (cur?.id === saved.id ? saved : cur));
            })
            .catch((err) => console.error('ReadingMap seenWorld save failed', err));
        }
      } catch (err) {
        console.error('ReadingMap load failed', err);
        if (!cancelled) setLoaded({ states: LEVELS.map(() => 'locked'), unlockAll: false });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Le niveau en cours (sinon le dernier) est amené au milieu de l'écran à l'ouverture.
  useEffect(() => {
    if (!loaded || scrolledRef.current) return;
    const index = loaded.states.indexOf('current');
    const target = LEVELS[index === -1 ? LEVELS.length - 1 : index];
    if (!target) return;
    document.querySelector(`[data-level="${CSS.escape(target.id)}"]`)?.scrollIntoView({ block: 'center' });
    scrolledRef.current = true;
  }, [loaded]);

  useEffect(() => {
    if (shakeId === null) return undefined;
    const id = window.setTimeout(() => setShakeId(null), 500);
    return () => window.clearTimeout(id);
  }, [shakeId]);

  if (!profile) return null;

  const open = (levelId: string, state: LevelState) => {
    if (!voiceReady || leavingRef.current) return;
    if (!isPlayable(state)) {
      playError();
      setShakeId(levelId);
      return;
    }
    leavingRef.current = true;
    playTap();
    navigate({ name: 'reading', levelId });
  };

  const count = loaded ? LEVELS.length : 0;
  const height = trackHeightFor(count);

  return (
    <div class="screen screen--map adv-map" data-testid="adventure-map" data-voice={voiceReady ? 'ready' : 'off'}>
      <div class="map-home">
        <IconButton size={56} onClick={() => returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
      </div>
      {remainingRatio !== null && <TimeRing ratio={remainingRatio} />}
      {loaded?.unlockAll && (
        <span class="adv-admin" data-testid="admin-badge" role="status" aria-label="Mode admin : tous les niveaux ouverts">
          <Icon name="key" size={26} />
        </span>
      )}
      {!voiceReady && (
        <div class="adv-unavailable" data-testid="reading-unavailable" role="status" aria-label="Le son du téléphone est coupé">
          <Icon name="speaker-off" size={56} />
        </div>
      )}
      {arrivalWorld !== null && <WorldBanner world={worldIdAt(arrivalWorld)} onDone={() => setArrivalWorld(null)} />}
      <div class="map-scroll">
        <div class="map-track" style={{ height }} ref={trackRef}>
          <MapScenery count={count} width={width} />
          {loaded &&
            LEVELS.map((level, i) => {
              const state = loaded.states[i] ?? 'locked';
              const pos = nodePosition(i, count, width);
              const colors = TRACK_COLORS[level.track];
              return (
                <div
                  key={level.id}
                  class="adv-node"
                  style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: NODE_SIZE, height: NODE_SIZE }}
                  data-world={worldIdAt(worldIndexForLevel(i))}
                >
                  {state === 'current' && (
                    <span class="map-node__avatar" aria-hidden="true">
                      <Emoji char={profile.avatar} />
                    </span>
                  )}
                  <button
                    type="button"
                    class={`rd-medal${shakeId === level.id ? ' rd-medal--shake' : ''}`}
                    data-testid={`reading-level-${level.index}`}
                    data-level={level.id}
                    data-game={level.game}
                    data-state={state}
                    disabled={!voiceReady}
                    aria-disabled={state === 'locked' ? 'true' : undefined}
                    aria-label={`Niveau ${level.index}`}
                    style={`--m-main:${colors.main};--m-soft:${colors.soft};--m-dark:${colors.dark}`}
                    onClick={() => open(level.id, state)}
                  >
                    <span class="rd-medal__face">
                      <LevelIcon level={level} />
                    </span>
                    {state === 'done' && (
                      <span class="rd-medal__badge rd-medal__badge--done" aria-hidden="true">
                        <Icon name="check" size="62%" />
                      </span>
                    )}
                    {state === 'locked' && (
                      <span class="rd-medal__badge rd-medal__badge--lock" aria-hidden="true">
                        <Icon name="lock" size="68%" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
