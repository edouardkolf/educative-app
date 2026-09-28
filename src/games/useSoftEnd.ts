// CONTRAT — fin douce partagée par les jeux hors parcours (docs/specs/HUB.md §4.4, arbitrage A4).
// Même comportement que `timeUpEnd` de LevelPlayer : l'unité en cours se termine (60 s au plus),
// puis la partie est enregistrée comme interrompue et l'écran de fin s'affiche.
// Le corps est écrit par la tâche « socle app ».

/** = NO_ANSWER_TIMEOUT_MS de LevelPlayer. */
export const SOFT_END_MAX_MS = 60_000;

export interface SoftEndOptions {
  /** Une unité est commencée et pas finie (retour de réussite et animation de fin compris). */
  busy: boolean;
  /** Enregistre l'interruption ; sans effet si aucune partie n'est ouverte. Appelée au plus une fois. */
  onTimeUp: () => Promise<void>;
}

export interface SoftEnd {
  /** Minuteur ou quota atteint : ne plus commencer d'unité. */
  timeUp: boolean;
  /**
   * Au DÉBUT de chaque unité (choix d'une série ou d'un dessin, mot suivant), jamais avant d'enregistrer.
   * `true` : la fin est lancée, ne rien commencer. Si le temps est écoulé, lance la fin et renvoie `true`.
   */
  checkpoint: () => boolean;
  /** Raison d'une sortie (maison, retour Android, démontage) : 'time-up' si le temps est écoulé, sinon 'quit'. */
  exitReason: () => 'quit' | 'time-up';
  /** Fin douce lancée : ne plus rien écrire au démontage. */
  endedRef: { readonly current: boolean };
}

export function useSoftEnd(_opts: SoftEndOptions): SoftEnd {
  throw new Error('useSoftEnd : à implémenter (docs/specs/HUB.md §4.4)');
}
