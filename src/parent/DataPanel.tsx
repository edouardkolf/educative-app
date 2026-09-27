// Onglet « Données » : sauvegarder la progression dans un fichier, ou la restaurer depuis un fichier.
import { useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { Icon } from '../ui/icons/Icon';
import { exportProgress } from './export';
import type { ExportOutcome } from './export';
import { ImportSection } from './ImportSection';

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

export function DataPanel() {
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [imported, setImported] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    const outcome = await exportProgress();
    setExportMessage(outcomeMessage(outcome));
    setExporting(false);
  }

  return (
    <>
      <section className="pa-section">
        <div className="pa-section__head">
          <span className="pa-section__icon" aria-hidden="true">
            <Icon name="export" size={30} />
          </span>
          <div>
            <h2 className="pa-section__title">Sauvegarder</h2>
            <p className="pa-muted">
              Crée un fichier avec les enfants et toute leur progression. Pratique pour changer de téléphone.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="pa-button pa-button--secondary"
          data-testid="export"
          onClick={handleExport}
          disabled={exporting}
        >
          <Icon name="export" size={24} />
          <span>{exporting ? 'Export en cours…' : 'Exporter la progression'}</span>
        </button>
        {exportMessage && (
          <p className={exportMessage.ok ? 'pa-success' : 'pa-error'} role="status">
            {exportMessage.text}
          </p>
        )}
      </section>

      <section className="pa-section">
        <div className="pa-section__head">
          <span className="pa-section__icon" aria-hidden="true">
            <Icon name="import" size={30} />
          </span>
          <div>
            <h2 className="pa-section__title">Restaurer</h2>
            <p className="pa-muted">
              Remplace toutes les données de ce téléphone par celles d'un fichier de sauvegarde. Le code parent
              reste le même.
            </p>
          </div>
        </div>
        <ImportSection onImported={() => setImported(true)} />
        {imported && (
          <button
            type="button"
            className="pa-button pa-button--secondary"
            onClick={() => navigate({ name: 'parent', path: [] }, { replace: true })}
          >
            <Icon name="children" size={24} />
            <span>Voir les enfants</span>
          </button>
        )}
      </section>
    </>
  );
}
