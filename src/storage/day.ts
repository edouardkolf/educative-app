// Jour local "YYYY-MM-DD" : module à part pour que `settings.ts` puisse l'utiliser sans import circulaire
// avec `index.ts` (qui le réexporte).

/** Jour local "YYYY-MM-DD" (pas UTC : minuit = minuit à la maison). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
