// Coquille de l'app : routeur par hash + état global (profil actif) + initialisation.
import { useEffect, useState } from 'preact/hooks';
import { parseHash, navigate, type Route } from './routes';
import { ProfileContext } from './context';
import { SessionProvider } from './SessionProvider';
import type { Profile } from '../storage/types';
import { closeStaleRuns, getSettings, requestPersistence } from '../storage';
import { setSoundEnabled, unlockAudio } from '../ui/sound';
import { ProfilePicker } from '../screens/ProfilePicker';
import { SagaMap } from '../screens/SagaMap';
import { LevelPlayer } from '../screens/LevelPlayer';
import { LockScreen } from '../screens/LockScreen';
import { ParentSpace } from '../parent/ParentSpace';

export function AppShell() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Initialisation au montage : jamais bloquante, erreurs journalisées seulement.
  useEffect(() => {
    closeStaleRuns().catch((err) => console.error('closeStaleRuns failed', err));
    requestPersistence().catch((err) => console.error('requestPersistence failed', err));
    getSettings()
      .then((settings) => setSoundEnabled(settings.soundOn))
      .catch((err) => console.error('getSettings failed', err));
  }, []);

  // Premier geste de l'enfant n'importe où : débloque l'audio (obligatoire sur mobile).
  useEffect(() => {
    const onFirstPointer = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', onFirstPointer);
    };
    window.addEventListener('pointerdown', onFirstPointer);
    return () => window.removeEventListener('pointerdown', onFirstPointer);
  }, []);

  // Garde de route unique (évite deux navigations concurrentes) : si l'écran de fin est actif
  // (settings.lock), on y reste bloqué sauf espace parent ou fin douce en cours (route "play" avec
  // un profil encore actif : LevelPlayer termine la manche puis navigue lui-même, voir §8) ; sinon,
  // pas de profil actif sur la carte ou en partie → retour aux profils.
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        const lockedElsewhere =
          settings.lock && route.name !== 'locked' && route.name !== 'parent' && !(route.name === 'play' && profile);
        if (lockedElsewhere) {
          navigate({ name: 'locked' }, { replace: true });
        } else if (!profile && (route.name === 'map' || route.name === 'play')) {
          navigate({ name: 'profiles' }, { replace: true });
        }
      })
      .catch((err) => console.error('route guard failed', err));
    return () => {
      cancelled = true;
    };
  }, [route, profile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      <SessionProvider route={route}>{renderRoute(route, profile)}</SessionProvider>
    </ProfileContext.Provider>
  );
}

function renderRoute(route: Route, profile: Profile | null) {
  switch (route.name) {
    case 'profiles':
      return <ProfilePicker />;
    case 'locked':
      return <LockScreen />;
    case 'map':
      return profile ? <SagaMap /> : null;
    case 'play':
      return profile ? <LevelPlayer levelId={route.levelId} /> : null;
    case 'parent':
      return <ParentSpace path={route.path} />;
    default:
      return null;
  }
}
