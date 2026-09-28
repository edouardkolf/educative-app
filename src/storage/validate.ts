// Aides de validation partagées par export-import.ts et les modules de jeu (dictations.ts, colorings.ts).
// Sorties d'export-import.ts (docs/specs/HUB.md §5.2) pour être partagées sans dépendance circulaire.

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
