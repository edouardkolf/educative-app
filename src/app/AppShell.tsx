// Coquille de l'app : routeur par hash + état global (profil actif) + initialisation.
import { useEffect, useState } from 'preact/hooks';
import { parseHash, navigate, type Route } from './routes';
import { ProfileContext } from './context';
import type { Profile } from '../storage/types';
import { closeStaleRuns, getSettings, requestPersistence } from '../storage';
import { setSoundEnabled, unlockAudio } from '../ui/sound';
import { ProfilePicker } from '../screens/ProfilePicker';
import { SagaMap } from '../screens/SagaMap';
import { LevelPlayer } from '../screens/LevelPlayer';
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

  // Pas de profil actif sur la carte ou en partie : retour aux profils.
  useEffect(() => {
    if (!profile && (route.name === 'map' || route.name === 'play')) {
      navigate({ name: 'profiles' }, { replace: true });
    }
  }, [route, profile]);

  return <ProfileContext.Provider value={{ profile, setProfile }}>{renderRoute(route, profile)}</ProfileContext.Provider>;
}

function renderRoute(route: Route, profile: Profile | null) {
  switch (route.name) {
    case 'profiles':
    case 'locked':
      // Écran de fin (bloquant) : arrive à l'étape suivante. Pour l'instant, écran profils.
      return <ProfilePicker />;
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
