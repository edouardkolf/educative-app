// Passage « Suivant » → carte → niveau suivant : la fin de niveau dépose ici le trajet à jouer,
// la carte le reprend une seule fois à son ouverture. En mémoire seulement : un rechargement de
// page ou un retour arrière vers la carte ne rejoue jamais le trajet.

export interface PendingHop {
  fromLevelId: string;
  toLevelId: string;
}

let pending: PendingHop | null = null;

export function requestHop(hop: PendingHop): void {
  pending = hop;
}

/** Rend le trajet demandé (s'il y en a un) et l'efface. */
export function takeHop(): PendingHop | null {
  const hop = pending;
  pending = null;
  return hop;
}
