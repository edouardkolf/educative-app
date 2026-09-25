// Tableau de bord : liste des enfants (temps du jour, +15 min), export/import, réglages, retour au jeu.
import { useCallback, useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { getTrack } from '../engine';
import { dayKey, getUsage, grantExtraMinutes, listProfiles } from '../storage';
import type { Profile, UsageDay } from '../storage';
import { exportProgress } from './export';
import type { ExportOutcome } from './export';
import { formatDailyUsage } from './format';
import { ImportSection } from './ImportSection';
import { ParentSettings } from './Settings';
import { describeError } from './util';

const GRANT_MINUTES = 15;

function trackTitle(trackId: string): string {
  try {
    return getTrack(trackId)?.title ?? trackId;
  } catch {
    return trackId;
  }
}

function outcomeMessage(outcome: ExportOutcome): { text: string; ok: boolean } {
  switch (outcome.status) {
    case 'shared':
      return { text: 'Sauvegarde partagée.', ok: true };
    case 'downloaded':
      return { text: 'Téléchargement du fichier de sauvegarde lancé.', ok: true };
    case 'cancelled':
      return { text: 'Export annulé.', ok: true };
    case 'error':
      return { text: `Échec de l'export : ${outcome.error}`, ok: false };
  }
}

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usageByProfile, setUsageByProfile] = useState<Record<string, UsageDay>>({});
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ text: string; ok: boolean } | null>(null);

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

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    const outcome = await exportProgress();
    setExportMessage(outcomeMessage(outcome));
    setExporting(false);
  }

  return (
    <div className="pa-space">
      <header className="pa-header">
        <h1>Espace parent</h1>
      </header>

      <section className="pa-section">
        <h2 className="pa-section__title">Enfants</h2>

        {loadError && <p className="pa-error">Impossible de charger les enfants : {loadError}</p>}
        {!loadError && profiles === null && <p className="pa-muted">Chargement…</p>}
        {!loadError && profiles !== null && profiles.length === 0 && (
          <p className="pa-muted">Aucun enfant pour l'instant.</p>
        )}

        {profiles && profiles.length > 0 && (
          <ul className="pa-child-list">
            {profiles.map((profile) => {
              const usage = usageByProfile[profile.id];
              return (
                <li key={profile.id} className="pa-child-card">
                  <span className="pa-child-card__avatar" aria-hidden="true">
                    {profile.avatar}
                  </span>
                  <div className="pa-child-card__info">
                    <p className="pa-child-card__name">{profile.name}</p>
                    <p className="pa-child-card__track">{trackTitle(profile.trackId)}</p>
                  </div>
                  <div className="pa-child-card__actions">
                    <button
                      type="button"
                      className="pa-button pa-button--secondary"
                      onClick={() => navigate({ name: 'parent', path: ['child', profile.id] })}
                    >
                      Statistiques
                    </button>
                    <button
                      type="button"
                      className="pa-button pa-button--secondary"
                      onClick={() => navigate({ name: 'parent', path: ['child', profile.id, 'edit'] })}
                    >
                      Modifier
                    </button>
                  </div>
                  {usage && (
                    <div className="pa-child-card__grant">
                      <span className="pa-child-card__usage">
                        {formatDailyUsage(usage.activeSeconds, profile.limits.dailyMinutes, usage.extraMinutes)}
                      </span>
                      <button
                        type="button"
                        className="pa-button pa-button--secondary"
                        data-testid={`grant-today-${profile.id}`}
                        disabled={grantingId === profile.id}
                        onClick={() => handleGrant(profile.id)}
                      >
                        {grantingId === profile.id ? 'Ajout…' : `+${GRANT_MINUTES} min aujourd'hui`}
                      </button>
                    </div>
                  )}
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
          Ajouter un enfant
        </button>
      </section>

      <section className="pa-section">
        <h2 className="pa-section__title">Données</h2>
        <button
          type="button"
          className="pa-button pa-button--secondary"
          data-testid="export"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Export en cours…' : 'Exporter la progression'}
        </button>
        {exportMessage && (
          <p className={exportMessage.ok ? 'pa-success' : 'pa-error'} role="status">
            {exportMessage.text}
          </p>
        )}

        <ImportSection onImported={() => void loadProfiles()} />
      </section>

      <ParentSettings />

      <button
        type="button"
        className="pa-button pa-button--ghost"
        data-testid="back-to-game"
        onClick={() => navigate({ name: 'profiles' })}
      >
        Retour au jeu
      </button>
    </div>
  );
}
