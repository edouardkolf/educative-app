// Carte du parcours ("saga") : niveau 1 en bas, chemin crème qui serpente vers le haut à travers
// des mondes successifs (forêt, mer, montagne…), un monde tous les LEVELS_PER_WORLD niveaux.
import { useEffect, useRef, useState } from 'preact/hooks';
import { computeLevelStates, getLevel, getTrackOrDefault } from '../engine';
import type { LevelState, MechanicId } from '../engine/types';
import { listOverrides, listRuns, saveProfile } from '../storage';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { useSession } from '../app/SessionProvider';
import { Shape } from '../ui/Shape';
import { StarRow } from '../ui/StarRow';
import { LongPressButton } from '../ui/LongPressButton';
import { MapScenery } from './map/MapScenery';
import {
  NODE_SIZE,
  buildRoute,
  nodePosition,
  pointBetweenNodes,
  trackHeightFor,
  worldIdAt,
  worldIndexForLevel,
  type Point,
} from './map/layout';
import { pendingWorldEntry, reachedWorldIndex, type WorldEntry } from './map/worlds';
import { takeHop } from './map/hop';
import { WorldBanner } from './map/WorldBanner';

/** Largeur de repli avant la première mesure (viewport Pixel 7). */
const FALLBACK_WIDTH = 412;
/** Arrivée dans un nouveau monde : pause, puis l'avatar sautille d'un niveau à l'autre. */
const TRAVEL_DELAY_MS = 600;
const TRAVEL_MS = 1800;
/** « Suivant » : la carte s'affiche, l'avatar saute jusqu'au niveau suivant, puis la partie s'ouvre. */
const HOP_DELAY_MS = 450;
const HOP_MS = 1100;
const HOP_ARRIVE_MS = 550;

/** Trajet d'un niveau au suivant, demandé par la fin de niveau (bouton « Suivant »). */
interface Hop {
  from: number;
  levelId: string;
  arrived: boolean;
}

interface WorldArrival {
  entry: WorldEntry;
  phase: 'travel' | 'banner';
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function MechanicIcon({ mechanic }: { mechanic: MechanicId | undefined }) {
  if (mechanic === 'sequence') {
    return (
      <span class="map-node__icon" aria-hidden="true">
        <Shape shape="circle" color="red" size={14} />
        <Shape shape="circle" color="blue" size={14} />
        <Shape shape="circle" color="red" size={14} />
      </span>
    );
  }
  if (mechanic === 'count') {
    return (
      <span class="map-node__icon map-node__icon--dots" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }
  if (mechanic === 'odd-one-out') {
    return (
      <span class="map-node__icon" aria-hidden="true">
        🔍
      </span>
    );
  }
  return null;
}

/** Indicateur discret (§8) : un soleil entouré d'un anneau qui se vide selon le temps restant. */
function TimeRing({ ratio }: { ratio: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));
  return (
    <div class="map-time-ring" aria-hidden="true">
      <svg class="map-time-ring__ring" viewBox="0 0 40 40" width={40} height={40}>
        <circle class="map-time-ring__track" cx="20" cy="20" r={radius} />
        <circle
          class="map-time-ring__progress"
          cx="20"
          cy="20"
          r={radius}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <span class="map-time-ring__sun">☀️</span>
    </div>
  );
}

export function SagaMap() {
  const { profile, setProfile } = useProfile();
  const { remainingRatio } = useSession();
  const [states, setStates] = useState<LevelState[] | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const scrolledRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [arrival, setArrival] = useState<WorldArrival | null>(null);
  const [hop, setHop] = useState<Hop | null>(null);
  const [traveller, setTraveller] = useState<Point | null>(null);
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? FALLBACK_WIDTH : window.innerWidth || FALLBACK_WIDTH,
  );

  // Le décor et le chemin sont en pixels : on suit la largeur réelle de la carte.
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
  }, [states !== null]);

  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    scrolledRef.current = false;
    (async () => {
      try {
        const track = getTrackOrDefault(profile.trackId); // F11 : parcours inconnu → premier disponible
        if (!track) {
          if (!cancelled) setStates([]);
          return;
        }
        const [runs, overrides] = await Promise.all([listRuns(profile.id), listOverrides(profile.id)]);
        if (cancelled) return;
        const next = computeLevelStates(track, runs, overrides);
        const entry = pendingWorldEntry(next, profile.seenWorld);
        setArrival(
          entry ? { entry, phase: entry.fromIndex === null || prefersReducedMotion() ? 'banner' : 'travel' } : null,
        );
        // L'arrivée dans un nouveau monde a sa propre fête : le trajet « Suivant » ne s'y ajoute pas.
        const requested = takeHop();
        const from = requested ? next.findIndex((s) => s.levelId === requested.fromLevelId) : -1;
        const target = next[from + 1];
        if (requested && !entry && from >= 0 && target?.levelId === requested.toLevelId && target.status !== 'locked') {
          if (prefersReducedMotion()) navigate({ name: 'play', levelId: target.levelId });
          else setHop({ from, levelId: target.levelId, arrived: false });
        }
        setStates(next);
        // Mémorise tout de suite le monde atteint : la fête ne se rejoue pas, même si l'enfant quitte
        // la carte en plein trajet. Premier passage (seenWorld absent) : calibrage silencieux.
        const reached = reachedWorldIndex(next);
        if (profile.seenWorld === undefined || reached > profile.seenWorld) {
          saveProfile({ ...profile, seenWorld: reached })
            .then((saved) => {
              if (!cancelled) setProfile((cur) => (cur?.id === saved.id ? saved : cur));
            })
            .catch((err) => console.error('SagaMap seenWorld save failed', err));
        }
      } catch (err) {
        console.error('SagaMap load failed', err);
        if (!cancelled) setStates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!states || states.length === 0 || scrolledRef.current) return;
    const from = arrival?.phase === 'travel' ? arrival.entry.fromIndex : (hop?.from ?? null);
    const target =
      (from !== null ? states[from] : undefined) ??
      states.find((s) => s.current) ?? [...states].reverse().find((s) => s.status === 'completed') ?? states[0];
    if (!target) return;
    const el = document.querySelector(`[data-level="${CSS.escape(target.levelId)}"]`);
    el?.scrollIntoView({ block: 'center' });
    scrolledRef.current = true;
  }, [states]);

  // Trajet de l'avatar d'un niveau au suivant : vers le premier niveau d'un nouveau monde (en
  // franchissant le passage), ou vers le niveau suivant après « Suivant ». La carte le suit en défilant.
  const worldTravel = arrival?.phase === 'travel' ? arrival.entry.fromIndex : null;
  const journey =
    worldTravel !== null
      ? { from: worldTravel, delayMs: TRAVEL_DELAY_MS, durationMs: TRAVEL_MS, bounces: 4 }
      : hop
        ? { from: hop.from, delayMs: HOP_DELAY_MS, durationMs: HOP_MS, bounces: 2 }
        : null;
  useEffect(() => {
    if (!journey || !states) return undefined;
    const { from, delayMs, durationMs, bounces } = journey;
    const count = states.length;
    const route = buildRoute(count, width);
    let frame = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const point = pointBetweenNodes(route, from, eased);
      const lift = Math.abs(Math.sin(eased * Math.PI * bounces)) * 16;
      setTraveller({ x: point.x, y: point.y - lift });
      const scroller = scrollRef.current;
      if (scroller) scroller.scrollTop = point.y - scroller.clientHeight / 2;
      if (t < 1) frame = requestAnimationFrame(step);
      else if (worldTravel !== null) setArrival((cur) => (cur ? { ...cur, phase: 'banner' } : cur));
      else setHop((cur) => (cur ? { ...cur, arrived: true } : cur));
    };
    setTraveller(nodePosition(from, count, width));
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      setTraveller(null);
    };
  }, [journey?.from, worldTravel, states, width]);

  // Arrivé : le niveau rebondit sous l'avatar, puis la partie s'ouvre d'elle-même.
  useEffect(() => {
    if (!hop?.arrived) return undefined;
    const timer = window.setTimeout(() => navigate({ name: 'play', levelId: hop.levelId }), HOP_ARRIVE_MS);
    return () => window.clearTimeout(timer);
  }, [hop?.arrived]);

  if (!profile) return null;

  const skipTravel = () => {
    if (hop) {
      navigate({ name: 'play', levelId: hop.levelId });
      return;
    }
    const target = arrival && states?.[arrival.entry.toIndex];
    if (target) document.querySelector(`[data-level="${CSS.escape(target.levelId)}"]`)?.scrollIntoView({ block: 'center' });
    setArrival((cur) => (cur ? { ...cur, phase: 'banner' } : cur));
  };

  const backToProfiles = () => {
    setProfile(null);
    navigate({ name: 'profiles' });
  };

  // Raccourci parent : même geste que sur l'écran des profils (appui long de 2 s, jamais un tap bref).
  // Le profil actif n'est pas vidé ici (la garde de route renverrait aussitôt vers les profils) :
  // l'espace parent ramène toujours aux profils, qui le re-sélectionnent.
  const openParent = () => navigate({ name: 'parent', path: [] });

  const tapLocked = (levelId: string) => {
    setShakeId(levelId);
    window.setTimeout(() => setShakeId((cur) => (cur === levelId ? null : cur)), 400);
  };

  const openLevel = (state: LevelState) => {
    if (state.status === 'locked') {
      tapLocked(state.levelId);
      return;
    }
    navigate({ name: 'play', levelId: state.levelId });
  };

  const count = states?.length ?? 0;
  const height = trackHeightFor(count);

  return (
    <div class="screen screen--map">
      <button type="button" class="map-back-avatar" onClick={backToProfiles} aria-label="Retour aux profils">
        {profile.avatar}
      </button>
      <LongPressButton
        class="lock-button"
        durationMs={2000}
        size={56}
        onLongPress={openParent}
        aria-label="Espace parent"
        data-testid="parent-access"
      >
        🔒
      </LongPressButton>
      {remainingRatio !== null && <TimeRing ratio={remainingRatio} />}
      {(arrival?.phase === 'travel' || hop) && (
        <div class="map-travel-shield" onClick={skipTravel} aria-hidden="true" data-testid="map-travel-shield" />
      )}
      {arrival?.phase === 'banner' && (
        <WorldBanner world={worldIdAt(arrival.entry.worldIndex)} onDone={() => setArrival(null)} />
      )}
      <div class="map-scroll" ref={scrollRef}>
        <div class="map-track" style={{ height }} ref={trackRef}>
          <MapScenery count={count} width={width} />
          {traveller && (
            <span
              class="map-traveller"
              data-testid="map-traveller"
              style={{ left: `${traveller.x}px`, top: `${traveller.y}px` }}
              aria-hidden="true"
            >
              {profile.avatar}
            </span>
          )}
          {states?.map((state, i) => {
            const pos = nodePosition(i, count, width);
            const level = getLevel(state.levelId);
            return (
              <div
                key={state.levelId}
                class={`map-node map-node--${state.status}${state.current ? ' is-current' : ''}${
                  shakeId === state.levelId ? ' is-shaking' : ''
                }${hop?.arrived && hop.levelId === state.levelId ? ' is-arrived' : ''}`}
                style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: NODE_SIZE, height: NODE_SIZE }}
                data-level={state.levelId}
                data-world={worldIdAt(worldIndexForLevel(i))}
                data-status={state.status}
                onClick={() => openLevel(state)}
              >
                {state.current && arrival?.phase !== 'travel' && !hop && (
                  <span class="map-node__avatar" aria-hidden="true">
                    {profile.avatar}
                  </span>
                )}
                <span class="map-node__disc">
                  {state.status === 'locked' ? (
                    <span aria-hidden="true">🔒</span>
                  ) : (
                    <MechanicIcon mechanic={level?.mechanic} />
                  )}
                </span>
                <StarRow count={state.bestStars} size={12} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
