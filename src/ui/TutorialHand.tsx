// Main animée du tutoriel : glisse du bas de l'écran vers le(s) choix à taper, mime un tap sur
// chacun dans l'ordre, en boucle. Une seule cible (cas courant) ou plusieurs à la suite (ex. color-mix :
// verser deux fioles).
import { useEffect, useRef } from 'preact/hooks';

interface TutorialHandProps {
  /** Suite de `data-choice` à taper, dans l'ordre. Un seul élément dans la plupart des mécaniques. */
  targets: readonly string[];
}

const TRAVEL_MS = 850;
const HOLD_MS = 850;
const TAP_MS = 300;
const SEGMENT_MS = TRAVEL_MS + HOLD_MS + TAP_MS;
const PAUSE_MS = 300; // pause avant de relancer le cycle depuis le bas de l'écran

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function TutorialHand({ targets }: TutorialHandProps) {
  const handRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const updatePositions = () => {
      positionsRef.current = targets.map((choice) => {
        const el = document.querySelector<HTMLElement>(`[data-choice="${CSS.escape(choice)}"]`);
        if (!el) return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    };
    updatePositions();
    window.addEventListener('resize', updatePositions);

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const travelMs = reduced ? 1 : TRAVEL_MS;
    const segmentMs = travelMs + HOLD_MS + TAP_MS;
    const cycleMs = segmentMs * targets.length + PAUSE_MS;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight + 40;
    const cycleStart = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const elapsed = (now - cycleStart) % cycleMs;
      const hand = handRef.current;
      const ripple = rippleRef.current;
      const positions = positionsRef.current;
      const segmentIndex = Math.min(Math.floor(elapsed / segmentMs), targets.length - 1);
      const inPause = elapsed >= segmentMs * targets.length;
      const segmentElapsed = elapsed - segmentIndex * segmentMs;
      const { x: tx, y: ty } = positions[segmentIndex] ?? { x: startX, y: startY };
      const previous = segmentIndex === 0 ? { x: startX, y: startY } : (positions[segmentIndex - 1] ?? { x: startX, y: startY });

      if (hand) {
        if (inPause) {
          hand.style.opacity = '0';
          if (ripple) ripple.style.opacity = '0';
        } else if (segmentElapsed < travelMs) {
          const t = easeOutCubic(segmentElapsed / travelMs);
          const x = reduced ? tx : lerp(previous.x, tx, t);
          const y = reduced ? ty : lerp(previous.y, ty, t);
          hand.style.opacity = String(Math.min(1, segmentElapsed / 150 + (reduced ? 1 : 0)));
          hand.style.transform = `translate(${x}px, ${y}px) translate(-50%, -60%) scale(1)`;
          if (ripple) ripple.style.opacity = '0';
        } else if (segmentElapsed < travelMs + HOLD_MS) {
          hand.style.opacity = '1';
          hand.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -60%) scale(1)`;
        } else if (segmentElapsed < travelMs + HOLD_MS + TAP_MS) {
          const t = (segmentElapsed - travelMs - HOLD_MS) / TAP_MS;
          const squash = 1 - Math.sin(t * Math.PI) * 0.16;
          hand.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -60%) scale(${squash})`;
          if (ripple) {
            ripple.style.opacity = String(1 - t);
            ripple.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(${0.5 + t * 1.1})`;
          }
        } else {
          hand.style.opacity = '0';
          if (ripple) ripple.style.opacity = '0';
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePositions);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.join('|')]);

  return (
    <div class="tutorial-hand-layer" aria-hidden="true">
      <div ref={rippleRef} class="tutorial-hand__ripple" />
      <div ref={handRef} class="tutorial-hand">
        👆
      </div>
    </div>
  );
}
