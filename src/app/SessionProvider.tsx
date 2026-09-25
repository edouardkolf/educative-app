// Horloge de session : compte le temps actif de l'enfant et applique le minuteur / le quota
// quotidien (docs/ARCHITECTURE.md §8). Ne rend rien de visible : fournit `useSession()` aux écrans.
import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import type { Route } from './routes';
import { navigate } from './routes';
import { useProfile } from './context';
import { computeTime, remainingRatio as computeRemainingRatio, shouldResumeSession } from './session';
import type { TimeStatus } from './session';
import { addActiveSeconds, dayKey, getSettings, getUsage, updateSettings } from '../storage';
import type { Profile, SessionState } from '../storage';

export interface SessionInfo extends TimeStatus {
  /** Fraction du temps restant le plus contraignant (indicateur de la carte) ; null = aucune limite. */
  remainingRatio: number | null;
  /** Miroir de `timeUp` en ref : à lire dans les callbacks différés (setTimeout) qui capturent un ancien rendu. */
  timeUpRef: { readonly current: TimeStatus['timeUp'] };
}

const EMPTY_STATUS: TimeStatus = { sessionRemainingSec: null, dailyRemainingSec: null, timeUp: null };
const TICK_MS = 5000;
const MAX_TICK_SEC = 10;

const SessionContext = createContext<SessionInfo>({
  ...EMPTY_STATUS,
  remainingRatio: null,
  timeUpRef: { current: null },
});

export function useSession(): SessionInfo {
  return useContext(SessionContext);
}

export function SessionProvider({ route, children }: { route: Route; children: ComponentChildren }) {
  const { profile } = useProfile();
  const [status, setStatus] = useState<TimeStatus>(EMPTY_STATUS);
  const [ratio, setRatio] = useState<number | null>(null);

  const profileRef = useRef<Profile | null>(null);
  const routeNameRef = useRef(route.name);
  const sessionRef = useRef<SessionState | null>(null);
  const lockedRef = useRef(false);
  const lastTickRef = useRef(Date.now());
  const timeUpRef = useRef<TimeStatus['timeUp']>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    routeNameRef.current = route.name;
  }, [route.name]);

  function applyStatus(next: TimeStatus, nextRatio: number | null) {
    timeUpRef.current = next.timeUp;
    setStatus(next);
    setRatio(nextRatio);
  }

  async function triggerLock(reason: 'session' | 'daily', profileId: string) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    try {
      await updateSettings({ lock: { reason, profileId, lockedAt: Date.now() } });
    } catch (err) {
      console.error('updateSettings(lock) failed', err);
    }
    // Hors partie : direction l'écran de fin tout de suite. En partie (route "play"), c'est
    // LevelPlayer qui gère la fin douce (manche en cours) puis navigue lui-même.
    if (routeNameRef.current !== 'play') {
      navigate({ name: 'locked' }, { replace: true });
    }
  }

  // À la sélection d'un profil et à chaque entrée sur la carte/en partie : reprend la session en
  // cours (shouldResumeSession) ou en ouvre une nouvelle, et resynchronise depuis le stockage —
  // un rechargement ou l'écran de fin (espace parent) a pu changer le verrou ou le temps restant
  // pendant que ce composant ne comptait pas.
  useEffect(() => {
    let cancelled = false;
    if (!profile || (route.name !== 'map' && route.name !== 'play')) {
      sessionRef.current = null;
      lockedRef.current = false;
      applyStatus(EMPTY_STATUS, null);
      return undefined;
    }
    (async () => {
      const settings = await getSettings();
      if (cancelled) return;
      const now = Date.now();
      const resumed = shouldResumeSession(settings.session, profile.id, now);
      const session: SessionState = resumed
        ? { ...(settings.session as SessionState), lastActiveAt: now }
        : { profileId: profile.id, startedAt: now, activeSeconds: 0, lastActiveAt: now };
      sessionRef.current = session;
      lastTickRef.current = now;
      lockedRef.current = Boolean(settings.lock);
      await updateSettings({ session });
      const usage = await getUsage(profile.id, dayKey());
      if (cancelled) return;
      applyStatus(computeTime(profile, usage, session), computeRemainingRatio(profile, usage, session));
    })().catch((err) => console.error('SessionProvider sync failed', err));
    return () => {
      cancelled = true;
    };
    // route est un objet neuf à chaque hashchange : seul son `name` doit redéclencher la synchro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, route.name]);

  // Toutes les 5 s et au passage en arrière-plan : additionne le temps actif écoulé (borné à 10 s
  // par relevé pour ne pas compter une mise en veille comme du temps de jeu).
  useEffect(() => {
    async function flush() {
      const activeProfile = profileRef.current;
      const session = sessionRef.current;
      const now = Date.now();
      if (!activeProfile || !session || lockedRef.current || document.visibilityState !== 'visible') {
        lastTickRef.current = now;
        return;
      }
      const elapsed = Math.min(MAX_TICK_SEC, Math.max(0, Math.round((now - lastTickRef.current) / 1000)));
      lastTickRef.current = now;
      if (elapsed <= 0) return;
      const updatedSession: SessionState = {
        ...session,
        activeSeconds: session.activeSeconds + elapsed,
        lastActiveAt: now,
      };
      sessionRef.current = updatedSession;
      try {
        const [usage] = await Promise.all([
          addActiveSeconds(activeProfile.id, dayKey(), elapsed),
          updateSettings({ session: updatedSession }),
        ]);
        const result = computeTime(activeProfile, usage, updatedSession);
        applyStatus(result, computeRemainingRatio(activeProfile, usage, updatedSession));
        if (result.timeUp) void triggerLock(result.timeUp, activeProfile.id);
      } catch (err) {
        console.error('flush (session) failed', err);
      }
    }

    const id = window.setInterval(() => void flush(), TICK_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush();
      else lastTickRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // Boucle stable pour toute la durée de vie de l'app : dépend uniquement des refs, jamais recréée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider value={{ ...status, remainingRatio: ratio, timeUpRef }}>
      {children}
    </SessionContext.Provider>
  );
}
