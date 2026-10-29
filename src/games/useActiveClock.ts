// Chronomètre du temps actif d'une partie (morpion, pendu) : ne compte que le temps où la page est
// visible (écran éteint ou autre app : en pause), comme `activeMs` des autres jeux (HUB.md §5.2, F10).
// La partie mesurée commence à `reset()`.
import { useEffect, useRef } from 'preact/hooks';

export interface ActiveClock {
  /** Repart de zéro (début d'une partie). */
  reset: () => void;
  /** Millisecondes actives depuis le dernier `reset()`. */
  elapsed: () => number;
}

/** Version pure, testable sans DOM : `now` et `hidden` sont fournis par l'appelant. */
export function createActiveClock(now: () => number, isHidden: () => boolean) {
  let accumulated = 0;
  let since: number | null = isHidden() ? null : now();
  return {
    reset() {
      accumulated = 0;
      since = isHidden() ? null : now();
    },
    elapsed() {
      return Math.round(accumulated + (since === null ? 0 : now() - since));
    },
    visibility(hidden: boolean) {
      if (hidden && since !== null) {
        accumulated += now() - since;
        since = null;
      } else if (!hidden && since === null) {
        since = now();
      }
    },
  };
}

export function useActiveClock(): ActiveClock {
  const clockRef = useRef<ReturnType<typeof createActiveClock> | null>(null);
  if (!clockRef.current) {
    clockRef.current = createActiveClock(
      () => Date.now(),
      () => typeof document !== 'undefined' && document.hidden,
    );
  }
  const clock = clockRef.current;

  useEffect(() => {
    const onVisibility = () => clock.visibility(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [clock]);

  return { reset: clock.reset, elapsed: clock.elapsed };
}
