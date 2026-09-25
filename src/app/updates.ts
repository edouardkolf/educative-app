// F12 : mémorise la fonction de mise à jour du service worker (fournie par `onNeedRefresh`, voir
// main.tsx), pour qu'elle soit appliquée seulement à un moment sûr (montage de l'écran profils,
// jamais en pleine partie) plutôt qu'immédiatement à la réception d'une nouvelle version.
let pendingUpdate: (() => void) | null = null;

export function setPendingUpdate(update: (() => void) | null): void {
  pendingUpdate = update;
}

export function hasPendingUpdate(): boolean {
  return pendingUpdate !== null;
}

/** Applique la mise à jour en attente (recharge la page), s'il y en a une. */
export function applyPendingUpdateIfAny(): void {
  if (pendingUpdate) {
    const update = pendingUpdate;
    pendingUpdate = null;
    update();
  }
}
