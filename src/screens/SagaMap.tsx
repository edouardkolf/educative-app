// Carte du parcours ("saga") : niveau 1 en bas, chemin en zigzag pointillé vers le haut.
import { useEffect, useRef, useState } from 'preact/hooks';
import { computeLevelStates, getLevel, getTrackOrDefault } from '../engine';
import type { LevelState, MechanicId } from '../engine/types';
import { listOverrides, listRuns } from '../storage';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { useSession } from '../app/SessionProvider';
import { Shape } from '../ui/Shape';
import { StarRow } from '../ui/StarRow';

const NODE_SIZE = 80;
const SPACING = 168;
const TOP_PAD = 120;
const BOTTOM_PAD = 140;

function trackHeightFor(count: number): number {
  return TOP_PAD + BOTTOM_PAD + Math.max(0, count - 1) * SPACING;
}

function positionFor(index: number, count: number): { x: number; y: number } {
  const height = trackHeightFor(count);
  return {
    x: 50 + Math.sin(index * (Math.PI / 2)) * 28,
    y: height - BOTTOM_PAD - index * SPACING,
  };
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
        setStates(computeLevelStates(track, runs, overrides));
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
    const target =
      states.find((s) => s.current) ?? [...states].reverse().find((s) => s.status === 'completed') ?? states[0];
    if (!target) return;
    const el = document.querySelector(`[data-level="${CSS.escape(target.levelId)}"]`);
    el?.scrollIntoView({ block: 'center' });
    scrolledRef.current = true;
  }, [states]);

  if (!profile) return null;

  const backToProfiles = () => {
    setProfile(null);
    navigate({ name: 'profiles' });
  };

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
  const positions = states?.map((_, i) => positionFor(i, count)) ?? [];
  const pathD = positions.length > 1 ? positions.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  return (
    <div class="screen screen--map">
      <button type="button" class="map-back-avatar" onClick={backToProfiles} aria-label="Retour aux profils">
        {profile.avatar}
      </button>
      {remainingRatio !== null && <TimeRing ratio={remainingRatio} />}
      <div class="map-scroll">
        <div class="map-track" style={{ height }}>
          <span class="map-decor" style={{ left: '12%', top: '8%' }} aria-hidden="true">
            ☁️
          </span>
          <span class="map-decor" style={{ left: '72%', top: '18%' }} aria-hidden="true">
            ☁️
          </span>
          <span class="map-decor" style={{ left: '18%', top: '45%' }} aria-hidden="true">
            🌳
          </span>
          <span class="map-decor" style={{ left: '80%', top: '60%' }} aria-hidden="true">
            ☁️
          </span>
          <span class="map-decor" style={{ left: '14%', top: '78%' }} aria-hidden="true">
            🌳
          </span>
          {pathD && (
            <svg class="map-path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
              <path d={pathD} class="map-path__line" />
            </svg>
          )}
          {states?.map((state, i) => {
            const pos = positionFor(i, count);
            const level = getLevel(state.levelId);
            return (
              <div
                key={state.levelId}
                class={`map-node map-node--${state.status}${state.current ? ' is-current' : ''}${
                  shakeId === state.levelId ? ' is-shaking' : ''
                }`}
                style={{ left: `${pos.x}%`, top: `${pos.y}px`, width: NODE_SIZE, height: NODE_SIZE }}
                data-level={state.levelId}
                data-status={state.status}
                onClick={() => openLevel(state)}
              >
                {state.current && (
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
