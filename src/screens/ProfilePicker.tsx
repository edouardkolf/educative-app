// Écran profils : grandes cartes avatar (l'enfant se reconnaît, pas besoin de lire).
// Accès parent : appui long de 2 s sur le cadenas (jamais un tap bref).
import { useEffect, useState } from 'preact/hooks';
import { listProfiles } from '../storage';
import type { Profile } from '../storage/types';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { LongPressButton } from '../ui/LongPressButton';

const DISC_COLORS = ['#FFB347', '#7FC8A9', '#6EC6FF', '#FF8FA3', '#C9A0FF', '#FFD166'];

export function ProfilePicker() {
  const { setProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProfiles()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch((err) => {
        console.error('listProfiles failed', err);
        if (!cancelled) setProfiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openParent = () => navigate({ name: 'parent', path: [] });

  const choose = (profile: Profile) => {
    setProfile(profile);
    navigate({ name: 'map' });
  };

  if (profiles === null) {
    return <div class="screen screen--loading" />;
  }

  if (profiles.length === 0) {
    return (
      <div class="screen screen--welcome">
        <div class="welcome-illustration" aria-hidden="true">
          🦊✨
        </div>
        <button type="button" class="welcome-button" onClick={openParent}>
          Commencer : espace parent
        </button>
      </div>
    );
  }

  return (
    <div class="screen screen--profiles">
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
      <div class="profile-grid">
        {profiles.map((profile, i) => (
          <button type="button" key={profile.id} class="profile-card" onClick={() => choose(profile)}>
            <span class="profile-card__avatar" style={{ background: DISC_COLORS[i % DISC_COLORS.length] }}>
              {profile.avatar}
            </span>
            <span class="profile-card__name">{profile.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
