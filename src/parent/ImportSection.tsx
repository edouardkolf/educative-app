// Import d'une sauvegarde : lecture du fichier, confirmation dans la page (jamais window.confirm),
// puis remplacement de toutes les données. Le code parent n'est jamais touché (contrat `importAll`).
import { useRef, useState } from 'preact/hooks';
import { importAll } from '../storage';
import { describeError } from './util';
import { describeImportCounts, formatImportConfirmation, parseImportFile } from './import';

type ImportState =
  | { kind: 'idle' }
  | { kind: 'confirm'; data: unknown; profiles: number; runs: number }
  | { kind: 'importing' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string };

export function ImportSection(props: { onImported: () => void }) {
  const [state, setState] = useState<ImportState>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (inputRef.current) inputRef.current.value = '';

    const parsed = parseImportFile(text);
    if ('error' in parsed) {
      setState({ kind: 'error', message: parsed.error });
      return;
    }
    const counts = describeImportCounts(parsed.data);
    setState({ kind: 'confirm', data: parsed.data, profiles: counts.profiles, runs: counts.runs });
  }

  function handleCancel() {
    setState({ kind: 'idle' });
  }

  async function handleConfirm() {
    if (state.kind !== 'confirm') return;
    setState({ kind: 'importing' });
    try {
      const result = await importAll(state.data);
      if (result.ok) {
        setState({
          kind: 'success',
          message: `Sauvegarde importée : ${result.profiles} enfant(s), ${result.runs} partie(s).`,
        });
        props.onImported();
      } else {
        setState({ kind: 'error', message: result.error });
      }
    } catch (err) {
      setState({ kind: 'error', message: describeError(err) });
    }
  }

  const busy = state.kind === 'importing' || state.kind === 'confirm';

  return (
    <div className="pa-import">
      <label className="pa-field">
        <span className="pa-field__label">Importer une sauvegarde</span>
        <input
          ref={inputRef}
          className="pa-input"
          type="file"
          accept="application/json,.json"
          data-testid="import-file"
          disabled={busy}
          onChange={handleFileChange}
        />
      </label>

      {state.kind === 'confirm' && (
        <div className="pa-import-confirm">
          <p>{formatImportConfirmation({ profiles: state.profiles, runs: state.runs })}</p>
          <div className="pa-form__actions">
            <button type="button" className="pa-button pa-button--danger" data-testid="import-confirm" onClick={handleConfirm}>
              Remplacer
            </button>
            <button type="button" className="pa-button pa-button--ghost" data-testid="import-cancel" onClick={handleCancel}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {state.kind === 'importing' && <p className="pa-muted">Import en cours…</p>}
      {state.kind === 'error' && (
        <p className="pa-error" role="alert">
          {state.message}
        </p>
      )}
      {state.kind === 'success' && (
        <p className="pa-success" role="status">
          {state.message}
        </p>
      )}
    </div>
  );
}
