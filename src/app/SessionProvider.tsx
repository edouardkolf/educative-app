// Horloge de session : compte le temps actif de l'enfant et applique le minuteur / le quota
// quotidien (docs/ARCHITECTURE.md §8). Ne rend rien de visible : fournit `useSession()` aux écrans.
import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import type { Route } from './routes';
import { navigate } from './routes';
import { useProfile } from './context';
import { computeTime, remainingRatio as computeRemainingRatio, resumeOrCreateSession } from './session';
import type { TimeStatus } from './session';
import { addActiveSeconds, dayKey, getSettings, getUsage, updateSettings } from '../storage';
import type { Profile, SessionState } from '../storage';

export interface SessionInfo extends TimeStatus {
  /** Fraction du temps restant le plus contraignant (indicateur de la carte) ; null = aucune limite. */
  remainingRatio: number | null;
  /** Miroir de `timeUp` en ref : à lire dans les callbacks différés (setTimeout) qui capturent un ancien rendu. */
  timeUpRef: { readonly current: TimeStatus['timeUp'] };
  /**
   * F1 : fin douce RÉELLEMENT en cours (verrou déclenché pendant une partie, manche en cours pas
   * encore terminée par LevelPlayer). Sert de garde-fou de route précis — jamais « un profil est en
   * mémoire », qui reste vrai bien après la fin douce et laisserait un retour Android relancer une partie.
   */
  softEndActive: boolean;
  /** À appeler par LevelPlayer dès qu'il bascule vers l'écran de fin (§8) : la fin douce est traitée. */
  clearSoftEnd: () => void;
}

const EMPTY_STATUS: TimeStatus = { sessionRemainingSec: null, dailyRemainingSec: null, timeUp: null };
const TICK_MS = 5000;
const MAX_TICK_SEC = 10;

const SessionContext = createContext<SessionInfo>({
  ...EMPTY_STATUS,
  remainingRatio: null,
  timeUpRef: { current: null },
  softEndActive: false,
  clearSoftEnd: () => {},
});

export function useSession(): SessionInfo {
  return useContext(SessionContext);
}

export function SessionProvider({ route, children }: { route: Route; children: ComponentChildren }) {
  const { profile } = useProfile();
  const [status, setStatus] = useState<TimeStatus>(EMPTY_STATUS);
  const [ratio, setRatio] = useState<number | null>(null);
  const [softEndActive, setSoftEndActive] = useState(false);

  const profileRef = useRef<Profile | null>(null);
  const routeNameRef = useRef(route.name);
  const sessionRef = useRef<SessionState | null>(null);
  /** F3 : miroir local de `settings.sessions` (toutes les sessions, une par enfant) pour ne jamais
   * écraser l'entrée d'un autre profil quand on ne fait qu'écrire celle du profil actif. */
  const sessionsRef = useRef<Record<string, SessionState>>({});
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
    // LevelPlayer qui gère la fin douce (manche en cours) puis navigue lui-même : le drapeau
    // `softEndActive` (F1) autorise la garde de route (AppShell) à laisser cette manche se terminer
    // au lieu de couper la partie immédiatement.
    if (routeNameRef.current === 'play') {
      setSoftEndActive(true);
    } else {
      navigate({ name: 'locked' }, { replace: true });
    }
  }

  /** F1 : LevelPlayer appelle ceci juste avant de naviguer vers l'écran de fin — la fin douce est traitée. */
  function clearSoftEnd() {
    setSoftEndActive(false);
  }

  /**
   * F9 : ajoute au profil actif le temps actif écoulé depuis `lastTickRef`, borné à `MAX_TICK_SEC`
   * (pour ne pas compter une mise en veille comme du temps de jeu), AVANT toute réinitialisation de
   * `lastTickRef`. Partagée par la boucle de 5 s, le passage en arrière-plan et la synchro de route
   * (carte ↔ partie) : ces trois points remettaient auparavant `lastTickRef` à `now` sans jamais
   * reporter l'écart, sous-comptant jusqu'à quelques secondes de jeu actif à chaque fois.
   * `requireVisible: false` sert au relevé pris au passage en `hidden` : à cet instant précis
   * `document.visibilityState` vaut déjà « hidden », mais l'écart à reporter était bien du temps où
   * l'app était visible, donc il doit compter quand même.
   */
  async function flushElapsed(now: number, { requireVisible = true }: { requireVisible?: boolean } = {}) {
    const activeProfile = profileRef.current;
    const session = sessionRef.current;
    if (!activeProfile || !session || lockedRef.current || (requireVisible && document.visibilityState !== 'visible')) {
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
    const nextSessions = { ...sessionsRef.current, [activeProfile.id]: updatedSession };
    sessionsRef.current = nextSessions;
    try {
      const [usage] = await Promise.all([
        addActiveSeconds(activeProfile.id, dayKey(), elapsed),
        updateSettings({ sessions: nextSessions }),
      ]);
      const result = computeTime(activeProfile, usage, updatedSession);
      applyStatus(result, computeRemainingRatio(activeProfile, usage, updatedSession));
      if (result.timeUp) void triggerLock(result.timeUp, activeProfile.id);
    } catch (err) {
      console.error('flush (session) failed', err);
    }
  }

  // À la sélection d'un profil et à chaque entrée sur la carte/en partie : reprend la session en
  // cours de CET enfant (shouldResumeSession) ou en ouvre une nouvelle, et resynchronise depuis le
  // stockage — un rechargement ou l'écran de fin (espace parent) a pu changer le verrou ou le temps
  // restant pendant que ce composant ne comptait pas.
  useEffect(() => {
    let cancelled = false;
    if (!profile || (route.name !== 'map' && route.name !== 'play')) {
      sessionRef.current = null;
      lockedRef.current = false;
      setSoftEndActive(false); // F1 : hors carte/partie, plus de fin douce à laisser continuer.
      applyStatus(EMPTY_STATUS, null);
      return undefined;
    }
    (async () => {
      // F9 : un changement de route carte ↔ partie (même profil) ne doit pas faire perdre l'écart
      // encore en attente depuis le dernier relevé de la boucle de 5 s.
      await flushElapsed(Date.now(), { requireVisible: false });
      if (cancelled) return;
      const settings = await getSettings();
      if (cancelled) return;
      sessionsRef.current = settings.sessions;
      if (settings.lock) {
        // F1 : le verrou est déjà actif (ex. retour Android vers une route map/play pendant qu'il
        // l'est encore) — ne JAMAIS ouvrir/reprendre une session ici, sinon le compteur repartirait
        // de 0 et le verrou ne serait plus jamais réappliqué (jeu illimité). On reflète juste la
        // limite atteinte ; la garde de route (AppShell) s'occupe de renvoyer vers l'écran de fin.
        sessionRef.current = null;
        lockedRef.current = true;
        applyStatus({ sessionRemainingSec: 0, dailyRemainingSec: 0, timeUp: settings.lock.reason }, 0);
        return;
      }
      const now = Date.now();
      // F3 : une session PAR enfant (settings.sessions[profileId]) — passer par le profil de la
      // fratrie n'écrase jamais la session en cours de cet enfant.
      const session = resumeOrCreateSession(settings.sessions, profile.id, now);
      sessionRef.current = session;
      lastTickRef.current = now;
      lockedRef.current = false;
      const nextSessions = { ...settings.sessions, [profile.id]: session };
      sessionsRef.current = nextSessions;
      await updateSettings({ sessions: nextSessions });
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

  // Toutes les 5 s et au passage en arrière-plan : additionne le temps actif écoulé.
  useEffect(() => {
    const id = window.setInterval(() => void flushElapsed(Date.now()), TICK_MS);
    const onVisibility = () => {
      // F9 : à cet instant, document.visibilityState est déjà "hidden" — le relevé doit malgré tout
      // compter l'écart jusqu'à maintenant (requireVisible: false), puisque l'app était visible juste avant.
      if (document.visibilityState === 'hidden') void flushElapsed(Date.now(), { requireVisible: false });
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
    <SessionContext.Provider value={{ ...status, remainingRatio: ratio, timeUpRef, softEndActive, clearSoftEnd }}>
      {children}
    </SessionContext.Provider>
  );
}
