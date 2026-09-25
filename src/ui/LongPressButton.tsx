// Bouton à appui long : un anneau se remplit pendant `durationMs` ; relâcher avant annule.
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface LongPressButtonProps {
  onLongPress: () => void;
  durationMs?: number;
  size?: number;
  children?: ComponentChildren;
  class?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function LongPressButton({
  onLongPress,
  durationMs = 2000,
  size = 56,
  children,
  class: extraClass,
  ...rest
}: LongPressButtonProps) {
  const [pressing, setPressing] = useState(false);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const setProgress = (ratio: number) => {
    const ring = ringRef.current;
    if (ring) ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - ratio));
  };

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancelPress = useCallback(() => {
    stop();
    setPressing(false);
    setProgress(0);
  }, [stop]);

  const start = useCallback(
    (event: PointerEvent) => {
      event.preventDefault();
      setPressing(true);
      const startedAt = performance.now();
      const tick = () => {
        const ratio = Math.min(1, (performance.now() - startedAt) / durationMs);
        setProgress(ratio);
        if (ratio >= 1) {
          stop();
          setPressing(false);
          setProgress(0);
          onLongPress();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [durationMs, onLongPress, stop],
  );

  useEffect(() => stop, [stop]);

  return (
    <button
      type="button"
      class={`long-press-button${pressing ? ' is-pressing' : ''}${extraClass ? ` ${extraClass}` : ''}`}
      style={{ width: size, height: size }}
      onPointerDown={start}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      {...rest}
    >
      <svg class="long-press-button__ring" viewBox="0 0 56 56" width={size} height={size} aria-hidden="true">
        <circle class="long-press-button__track" cx="28" cy="28" r={RADIUS} />
        <circle
          ref={ringRef}
          class="long-press-button__progress"
          cx="28"
          cy="28"
          r={RADIUS}
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE }}
        />
      </svg>
      <span class="long-press-button__icon">{children}</span>
    </button>
  );
}
