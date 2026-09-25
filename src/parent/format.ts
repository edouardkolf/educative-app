// Formatage des statistiques pour l'espace parent (logique pure — voir format.test.ts).

/** Taux (0 à 1) en pourcentage arrondi ; « — » si aucune manche jouée. */
export function formatPercentage(rate: number | null): string {
  if (rate === null) return '—';
  return `${Math.round(rate * 100)} %`;
}

/** Durée en « X min SS s » (ou « X s » sous la minute). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`;
}

/** Date et heure locales courtes (« 15/01/2026 09:05 ») ; « — » si jamais jouée. */
export function formatDateTime(ms: number | null): string {
  if (ms === null) return '—';
  const date = new Date(ms);
  const datePart = date.toLocaleDateString('fr-FR');
  const timePart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart}`;
}

/**
 * Résumé du temps de jeu du jour pour le tableau de bord (ex. « Aujourd'hui : 12 min sur 30 »).
 * Le total affiché inclut les minutes bonus accordées par le parent ; « sans limite » si `dailyMinutesLimit` est null.
 */
export function formatDailyUsage(activeSeconds: number, dailyMinutesLimit: number | null, extraMinutes: number): string {
  const used = Math.floor(activeSeconds / 60);
  if (dailyMinutesLimit === null) return `Aujourd'hui : ${used} min (sans limite)`;
  return `Aujourd'hui : ${used} min sur ${dailyMinutesLimit + extraMinutes}`;
}
