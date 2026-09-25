// Options de limites de temps du formulaire enfant (logique pure — voir limits.test.ts).

/** Durées de session proposées, en minutes ; null = sans limite. */
export const SESSION_MINUTES_OPTIONS: ReadonlyArray<number | null> = [null, 10, 15, 20, 30, 45];

/** Temps de jeu quotidien proposé, en minutes ; null = sans limite. */
export const DAILY_MINUTES_OPTIONS: ReadonlyArray<number | null> = [null, 15, 20, 30, 45, 60, 90];

/** Étiquette lisible d'une option de limite. */
export function limitOptionLabel(minutes: number | null): string {
  return minutes === null ? 'Sans limite' : `${minutes} min`;
}

/** Valeur HTML d'un <select> pour une limite (chaîne vide = sans limite). */
export function minutesToSelectValue(minutes: number | null): string {
  return minutes === null ? '' : String(minutes);
}

/** Limite correspondant à la valeur choisie dans un <select>. */
export function selectValueToMinutes(value: string): number | null {
  return value === '' ? null : Number(value);
}
