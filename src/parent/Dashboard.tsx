// Onglet « Enfants » : une carte par enfant (temps du jour, +15 min, statistiques, modification)
// et l'ajout d'un enfant. Les données et les réglages ont leurs propres onglets (ParentShell).
import { useCallback, useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { getTrack } from '../engine';
import { dayKey, getUsage, grantExtraMinutes, listProfiles } from '../storage';
import type { Profile, UsageDay } from '../storage';
import { Emoji } from '../ui/Emoji';
import { Icon } from '../ui/icons/Icon';
import { formatDailyUsage } from './format';
import { describeError } from './util';

const GRANT_MINUTES = 15;

function trackTitle(trackId: string): string {
  try {
    return getTrack(trackId)?.title ?? trackId;
  } catch {
    return trackId;
  }
}

/** Part du temps du jour déjà utilisée (0–1), ou null si l'enfant n'a pas de limite quotidienne. */
function usageRatio(usage: UsageDay, dailyMinutes: number | null): number | null {
  if (dailyMinutes === null) return null;
  const allowed = (dailyMinutes + usage.extraMinutes) * 60;
  if (allowed <= 0) return 1;
  return Math.min(1, usage.activeSeconds / allowed);
}

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usageByProfile, setUsageByProfile] = useState<Record<string, UsageDay>>({});
  const [grantingId, setGrantingId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      const list = await listProfiles();
      const today = dayKey();
      const entries = await Promise.all(list.map(async (p) => [p.id, await getUsage(p.id, today)] as const));
      setProfiles(list);
      setUsageByProfile(Object.fromEntries(entries));
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err));
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  async function handleGrant(profileId: string) {
    setGrantingId(profileId);
    try {
      const updated = await grantExtraMinutes(profileId, dayKey(), GRANT_MINUTES);
      setUsageByProfile((prev) => ({ ...prev, [profileId]: updated }));
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setGrantingId(null);
    }
  }

  return (
    <>
      {loadError && <p className="pa-error">Impossible de charger les enfants : {loadError}</p>}
      {!loadError && profiles === null && <p className="pa-muted">Chargement…</p>}
      {!loadError && profiles !== null && profiles.length === 0 && (
        <div className="pa-empty">
          <Icon name="children" size={64} />
          <p className="pa-muted">Aucun enfant pour l'instant.</p>
        </div>
      )}

      {profiles && profiles.length > 0 && (
        <ul className="pa-child-list">
          {profiles.map((profile) => {
            const usage = usageByProfile[profile.id];
            const ratio = usage ? usageRatio(usage, profile.limits.dailyMinutes) : null;
            return (
              <li key={profile.id} className="pa-child-card">
                <div className="pa-child-card__top">
                  <span className="pa-child-card__avatar" aria-hidden="true">
                    <Emoji char={profile.avatar} />
                  </span>
                  <div className="pa-child-card__info">
                    <p className="pa-child-card__name">{profile.name}</p>
                    <p className="pa-child-card__track">{trackTitle(profile.trackId)}</p>
                  </div>
                </div>

                {usage && (
                  <div className="pa-child-card__time">
                    <div className="pa-child-card__time-row">
                      <span className="pa-child-card__usage">
                        {formatDailyUsage(usage.activeSeconds, profile.limits.dailyMinutes, usage.extraMinutes)}
                      </span>
                      <button
                        type="button"
                        className="pa-chip"
                        data-testid={`grant-today-${profile.id}`}
                        disabled={grantingId === profile.id}
                        onClick={() => handleGrant(profile.id)}
                      >
                        <Icon name="clock-plus" size={22} />
                        <span>{grantingId === profile.id ? 'Ajout…' : `+${GRANT_MINUTES} min aujourd'hui`}</span>
                      </button>
                    </div>
                    {ratio !== null && (
                      <span
                        className={`pa-time-meter${ratio >= 1 ? ' pa-time-meter--full' : ''}`}
                        aria-hidden="true"
                      >
                        <span className="pa-time-meter__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
                      </span>
                    )}
                  </div>
                )}

                <div className="pa-child-card__actions">
                  <button
                    type="button"
                    className="pa-button pa-button--secondary"
                    onClick={() => navigate({ name: 'parent', path: ['child', profile.id] })}
                  >
                    <Icon name="stats" size={24} />
                    <span>Statistiques</span>
                  </button>
                  <button
                    type="button"
                    className="pa-button pa-button--secondary"
                    onClick={() => navigate({ name: 'parent', path: ['child', profile.id, 'edit'] })}
                  >
                    <Icon name="edit" size={24} />
                    <span>Modifier</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="pa-button pa-button--primary"
        data-testid="add-child"
        onClick={() => navigate({ name: 'parent', path: ['new-child'] })}
      >
        <Icon name="plus" size={26} />
        <span>Ajouter un enfant</span>
      </button>
    </>
  );
}
