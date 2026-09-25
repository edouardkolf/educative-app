// Main animée du tutoriel : glisse du bas de l'écran vers le choix à taper, mime un tap, en boucle.
import { useEffect, useRef } from 'preact/hooks';

interface TutorialHandProps {
  answer: string;
}

const CYCLE_MS = 3000;
const TRAVEL_MS = 850;
const HOLD_MS = 850;
const TAP_MS = 300;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function TutorialHand({ answer }: TutorialHandProps) {
  const handRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateTarget = () => {
      const el = document.querySelector<HTMLElement>(`[data-choice="${CSS.escape(answer)}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      targetRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    updateTarget();
    window.addEventListener('resize', updateTarget);

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const travelMs = reduced ? 1 : TRAVEL_MS;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight + 40;
    const cycleStart = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const elapsed = (now - cycleStart) % CYCLE_MS;
      const hand = handRef.current;
      const ripple = rippleRef.current;
      const { x: tx, y: ty } = targetRef.current;
      if (hand) {
        if (elapsed < travelMs) {
          const t = easeOutCubic(elapsed / travelMs);
          const x = reduced ? tx : lerp(startX, tx, t);
          const y = reduced ? ty : lerp(startY, ty, t);
          hand.style.opacity = String(Math.min(1, elapsed / 150 + (reduced ? 1 : 0)));
          hand.style.transform = `translate(${x}px, ${y}px) translate(-50%, -60%) scale(1)`;
          if (ripple) ripple.style.opacity = '0';
        } else if (elapsed < travelMs + HOLD_MS) {
          hand.style.opacity = '1';
          hand.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -60%) scale(1)`;
        } else if (elapsed < travelMs + HOLD_MS + TAP_MS) {
          const t = (elapsed - travelMs - HOLD_MS) / TAP_MS;
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
      window.removeEventListener('resize', updateTarget);
    };
  }, [answer]);

  return (
    <div class="tutorial-hand-layer" aria-hidden="true">
      <div ref={rippleRef} class="tutorial-hand__ripple" />
      <div ref={handRef} class="tutorial-hand">
        👆
      </div>
    </div>
  );
}
