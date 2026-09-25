// Export de la sauvegarde : JSON indenté, partagé (mobile) ou téléchargé (bureau).
import { dayKey, exportAll } from '../storage';
import { describeError } from './util';

export type ExportOutcome =
  | { status: 'shared' }
  | { status: 'downloaded' }
  | { status: 'cancelled' }
  | { status: 'error'; error: string };

function canShareFiles(nav: Navigator): nav is Navigator & Required<Pick<Navigator, 'canShare' | 'share'>> {
  return typeof nav.canShare === 'function' && typeof nav.share === 'function';
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Exporte toute la progression en JSON et propose de la partager ou de la télécharger. */
export async function exportProgress(): Promise<ExportOutcome> {
  try {
    const bundle = await exportAll();
    const json = JSON.stringify(bundle, null, 2);
    const file = new File([json], `petits-malins-${dayKey()}.json`, { type: 'application/json' });

    if (canShareFiles(navigator) && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sauvegarde Petits Malins' });
        return { status: 'shared' };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { status: 'cancelled' };
        }
        throw err;
      }
    }

    downloadFile(file);
    return { status: 'downloaded' };
  } catch (err) {
    return { status: 'error', error: describeError(err) };
  }
}
