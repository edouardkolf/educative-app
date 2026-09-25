// Écran profils : grandes cartes avatar (l'enfant se reconnaît, pas besoin de lire).
// Accès parent : appui long de 2 s sur le cadenas (jamais un tap bref).
import { useEffect, useState } from 'preact/hooks';
import { dayKey, getUsage, listProfiles } from '../storage';
import type { Profile } from '../storage/types';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { computeTime } from '../app/session';
import { applyPendingUpdateIfAny } from '../app/updates';
import { LongPressButton } from '../ui/LongPressButton';

const DISC_COLORS = ['#FFB347', '#7FC8A9', '#6EC6FF', '#FF8FA3', '#C9A0FF', '#FFD166'];

export function ProfilePicker() {
  const { setProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [exhausted, setExhausted] = useState<Set<string>>(new Set());
  const [shakeId, setShakeId] = useState<string | null>(null);

  // F2 : vide le profil actif dès qu'on revient sur l'écran profils, pour qu'un profil resté en
  // mémoire (fin de partie, retour Android…) n'écrive plus jamais dans le stockage par erreur.
  useEffect(() => {
    setProfile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F12 : moment sûr pour appliquer une mise à jour de la PWA en attente (aucune partie en cours).
  useEffect(() => {
    applyPendingUpdateIfAny();
  }, []);

  useEffect(() => {
    let cancelled = false;
    listProfiles()
      .then(async (list) => {
        if (cancelled) return;
        setProfiles(list);
        // Quota du jour épuisé (§8) : un enfant apparaît estompé, indépendamment du minuteur de session.
        const day = dayKey();
        const results = await Promise.all(
          list.map(async (p) => {
            const usage = await getUsage(p.id, day);
            return computeTime(p, usage, null).dailyRemainingSec === 0 ? p.id : null;
          }),
        );
        if (!cancelled) setExhausted(new Set(results.filter((id): id is string => id !== null)));
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

  const shake = (id: string) => {
    setShakeId(id);
    window.setTimeout(() => setShakeId((cur) => (cur === id ? null : cur)), 400);
  };

  const choose = (profile: Profile) => {
    if (exhausted.has(profile.id)) {
      shake(profile.id);
      return;
    }
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
        {profiles.map((profile, i) => {
          const isExhausted = exhausted.has(profile.id);
          return (
            <button
              type="button"
              key={profile.id}
              class={`profile-card${isExhausted ? ' profile-card--exhausted' : ''}${
                shakeId === profile.id ? ' is-shaking' : ''
              }`}
              onClick={() => choose(profile)}
              data-exhausted={isExhausted ? 'true' : undefined}
            >
              <span class="profile-card__avatar" style={{ background: DISC_COLORS[i % DISC_COLORS.length] }}>
                {profile.avatar}
              </span>
              {isExhausted && (
                <span class="profile-card__badge" aria-hidden="true">
                  🌙
                </span>
              )}
              <span class="profile-card__name">{profile.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
