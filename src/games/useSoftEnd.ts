// Fin douce partagée par les jeux hors parcours (docs/specs/HUB.md §4.4, arbitrage A4).
// Même comportement que `timeUpEnd` de LevelPlayer : l'unité en cours se termine (60 s au plus),
// puis la partie est enregistrée comme interrompue et l'écran de fin s'affiche.
//
// La décision (faut-il finir tout de suite, ou attendre combien de temps) est une fonction pure,
// `decideSoftEnd`, testable sous Vitest sans DOM ; le hook ne fait qu'y brancher les refs et les effets.
import { useEffect, useRef } from 'preact/hooks';
import { useSession } from '../app/SessionProvider';
import { navigate } from '../app/routes';

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

export interface SoftEndState {
  timeUp: boolean;
  busy: boolean;
  /** Fin déjà lancée : la décision ne fait plus rien. */
  ended: boolean;
  /** Premier instant (ms) où le temps a été vu écoulé, ou `null` s'il ne l'a pas encore été. */
  seenAt: number | null;
  now: number;
}

export interface SoftEndDecision {
  /** La fin doit être lancée tout de suite. */
  end: boolean;
  /** Millisecondes avant de retenter (fin retardée par `busy`), ou `null` si rien à programmer. */
  retryInMs: number | null;
  /** Valeur à conserver pour `seenAt` (posée à `now` au premier passage, jamais changée ensuite). */
  seenAt: number | null;
}

/**
 * Règle 2 de HUB.md §4.4 : temps écoulé et pas occupé → fin immédiate. Occupé → fin quand `busy`
 * repasse à faux, au plus tard `SOFT_END_MAX_MS` après le premier instant où le temps a été vu
 * écoulé — ce délai n'est jamais remis à zéro, puisqu'aucune nouvelle unité ne doit plus commencer.
 */
export function decideSoftEnd({ timeUp, busy, ended, seenAt, now }: SoftEndState): SoftEndDecision {
  if (ended || !timeUp) return { end: false, retryInMs: null, seenAt };
  const at = seenAt ?? now;
  if (!busy) return { end: true, retryInMs: null, seenAt: at };
  return { end: false, retryInMs: Math.max(0, SOFT_END_MAX_MS - (now - at)), seenAt: at };
}

/** Règle 5 : une sortie pendant la fin douce est une interruption, pas un abandon. */
export function exitReasonFor(timeUp: boolean): 'quit' | 'time-up' {
  return timeUp ? 'time-up' : 'quit';
}

export function useSoftEnd(opts: SoftEndOptions): SoftEnd {
  const { timeUp, timeUpRef, clearSoftEnd } = useSession();

  const endedRef = useRef(false);
  const onTimeUpRef = useRef(opts.onTimeUp);
  onTimeUpRef.current = opts.onTimeUp;
  const seenAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  /** Lance la fin une seule fois : enregistre l'interruption, puis `clearSoftEnd`, puis verrouille. */
  const end = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void (async () => {
      try {
        await onTimeUpRef.current();
      } catch (err) {
        console.error('useSoftEnd onTimeUp failed', err);
      }
      clearSoftEnd();
      navigate({ name: 'locked' }, { replace: true });
    })();
  };

  const checkpoint = (): boolean => {
    if (endedRef.current) return true;
    if (timeUpRef.current) {
      end();
      return true;
    }
    return false;
  };

  const exitReason = (): 'quit' | 'time-up' => exitReasonFor(Boolean(timeUpRef.current));

  useEffect(() => {
    const decision = decideSoftEnd({
      timeUp: Boolean(timeUp),
      busy: opts.busy,
      ended: endedRef.current,
      seenAt: seenAtRef.current,
      now: Date.now(),
    });
    seenAtRef.current = decision.seenAt;
    if (decision.end) {
      end();
      return undefined;
    }
    if (decision.retryInMs !== null) {
      const id = window.setTimeout(end, decision.retryInMs);
      timerRef.current = id;
      return () => window.clearTimeout(id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, opts.busy]);

  // Règle 6 : le jeu démonté pendant la fin douce (maison, retour Android) rend la main à la garde de
  // route (`softEndActive` remis à faux) sans écrire en base ; c'est le jeu qui clôt sa partie avec
  // `exitReason()` dans son propre nettoyage, sauf si `endedRef` est déjà vrai.
  useEffect(() => {
    return () => {
      if (!endedRef.current) clearSoftEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { timeUp: Boolean(timeUp), checkpoint, exitReason, endedRef };
}
