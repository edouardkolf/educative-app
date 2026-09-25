// Petit utilitaire partagé par l'espace parent.

/** Message lisible pour une erreur inconnue (ex. stub « not implemented » du stockage/moteur). */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
