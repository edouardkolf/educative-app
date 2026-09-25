// Tableau de bord : liste des enfants, ajout, export, état du stockage, retour au jeu.
import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { getTrack } from '../engine';
import { isPersisted, listProfiles } from '../storage';
import type { Profile } from '../storage';
import { exportProgress } from './export';
import type { ExportOutcome } from './export';
import { describeError } from './util';

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
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProfiles()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err));
      });
    isPersisted()
      .then((value) => {
        if (!cancelled) setPersisted(value);
      })
      .catch(() => {
        if (!cancelled) setPersisted(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            {profiles.map((profile) => (
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
              </li>
            ))}
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
        <p className={persisted ? 'pa-success' : 'pa-muted'}>
          {persisted === null
            ? 'Vérification du stockage…'
            : persisted
              ? 'Stockage protégé ✓'
              : "Stockage non protégé : installez l'app sur l'écran d'accueil pour éviter toute perte."}
        </p>
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
      </section>

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
