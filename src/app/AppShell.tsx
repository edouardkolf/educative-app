// Coquille de l'app : routeur par hash + état global (profil actif) + initialisation.
import { useEffect, useState } from 'preact/hooks';
import { ensureHistoryDepth, isChildRoute, isGameRoute, isSoftEndRoute, parseHash, navigate, type Route } from './routes';
import { ProfileContext, useProfile } from './context';
import { SessionProvider, useSession } from './SessionProvider';
import type { Profile } from '../storage/types';
import { closeStaleGameRecords, closeStaleRuns, getProfile, getSettings, requestPersistence } from '../storage';
import { visibleGameIds } from '../games';
import { setSoundEnabled, unlockAudio } from '../ui/sound';
import { ProfilePicker } from '../screens/ProfilePicker';
import { SagaMap } from '../screens/SagaMap';
import { LevelPlayer } from '../screens/LevelPlayer';
import { LockScreen } from '../screens/LockScreen';
import { ParentSpace } from '../parent/ParentSpace';
import { Hub } from '../screens/Hub';
import { DictationScreen } from '../games/dictation/DictationScreen';
import { ColoringScreen } from '../games/coloring/ColoringScreen';

export function AppShell() {
  // Premier rendu : pose `history.state.depth = 0` si l'entrée courante n'en a pas encore (HUB.md §4.1).
  const [route, setRoute] = useState<Route>(() => {
    ensureHistoryDepth();
    return parseHash(location.hash);
  });
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Initialisation au montage : jamais bloquante, erreurs journalisées seulement.
  useEffect(() => {
    closeStaleRuns().catch((err) => console.error('closeStaleRuns failed', err));
    closeStaleGameRecords().catch((err) => console.error('closeStaleGameRecords failed', err));
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

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      <SessionProvider route={route}>
        <RouteGuard route={route} />
        {renderRoute(route, profile)}
      </SessionProvider>
    </ProfileContext.Provider>
  );
}

/**
 * Garde de route unique (évite deux navigations concurrentes), à l'intérieur de `SessionProvider`
 * pour lire `softEndActive` (F1). Si l'écran de fin est actif (`settings.lock`), on y reste bloqué
 * sauf espace parent ou fin douce RÉELLEMENT en cours (route de fin douce ET `softEndActive` :
 * LevelPlayer ou `useSoftEnd` termine l'unité en cours puis navigue lui-même, voir §8) — jamais
 * seulement « un profil est en mémoire », qui reste vrai bien après la fin douce et laisserait un
 * retour Android relancer une partie ou un jeu (F1).
 * Sinon, sur un écran de l'enfant (hub, carte, partie, jeu) : pas de profil actif → retour aux
 * profils ; profil actif mais supprimé entre-temps (espace parent, F2) → revalidé avec `getProfile`,
 * absent → retour aux profils ; route de jeu non visible pour ce profil → hub (HUB.md §6.2).
 */
function RouteGuard({ route }: { route: Route }) {
  const { profile, setProfile } = useProfile();
  const { softEndActive } = useSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await getSettings();
      if (cancelled) return;
      const softEndInProgress = isSoftEndRoute(route.name) && softEndActive;
      const lockedElsewhere = settings.lock && route.name !== 'locked' && route.name !== 'parent' && !softEndInProgress;
      if (lockedElsewhere) {
        navigate({ name: 'locked' }, { replace: true });
        return;
      }
      if (!isChildRoute(route.name)) return;
      if (!profile) {
        navigate({ name: 'profiles' }, { replace: true });
        return;
      }
      const fresh = await getProfile(profile.id);
      if (cancelled) return;
      if (!fresh) {
        setProfile(null);
        navigate({ name: 'profiles' }, { replace: true });
        return;
      }
      if (isGameRoute(route.name) && !visibleGameIds(fresh).includes(route.name)) {
        navigate({ name: 'hub' }, { replace: true });
      }
    })().catch((err) => console.error('route guard failed', err));
    return () => {
      cancelled = true;
    };
  }, [route, profile, softEndActive, setProfile]);

  return null;
}

function renderRoute(route: Route, profile: Profile | null) {
  switch (route.name) {
    case 'profiles':
      return <ProfilePicker />;
    case 'locked':
      return <LockScreen />;
    case 'hub':
      return profile ? <Hub /> : null;
    case 'map':
      return profile ? <SagaMap /> : null;
    case 'play':
      return profile ? <LevelPlayer levelId={route.levelId} /> : null;
    case 'dictation':
      return profile ? <DictationScreen /> : null;
    case 'coloring':
      return profile ? <ColoringScreen /> : null;
    case 'parent':
      return <ParentSpace path={route.path} />;
    default:
      return null;
  }
}
