// Fête d'arrivée dans un nouveau monde : grand panneau de bois qui surgit, rayons et particules du monde.
// Se ferme seule au bout de BANNER_MS, ou au premier tap.
import { useEffect, useMemo } from 'preact/hooks';
import { playFanfare } from '../../ui/sound';
import type { WorldId } from './layout';
import { WORLD_META } from './worlds';

export const BANNER_MS = 3200;
const PARTICLE_COUNT = 18;

interface Props {
  world: WorldId;
  onDone: () => void;
}

export function WorldBanner({ world, onDone }: Props) {
  const meta = WORLD_META[world];
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        glyph: meta.particles[i % meta.particles.length],
        left: (i * 53) % 100,
        delay: (i % 6) * 0.18,
        duration: 2.2 + ((i * 7) % 5) * 0.2,
        size: 22 + ((i * 11) % 3) * 8,
      })),
    [world],
  );

  useEffect(() => {
    playFanfare();
    const timer = window.setTimeout(onDone, BANNER_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      class={`world-banner world-banner--${world}`}
      role="dialog"
      aria-label={`Nouveau monde : ${meta.label}`}
      data-testid="world-banner"
      data-world={world}
      onClick={onDone}
    >
      <div class="world-banner__particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            class="world-banner__particle"
            style={{
              left: `${p.left}%`,
              fontSize: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.glyph}
          </span>
        ))}
      </div>
      <div class="world-banner__sign" aria-hidden="true">
        <div class="world-banner__rays" />
        <div class="world-banner__board">
          <span class="world-banner__icon">{meta.icon}</span>
        </div>
        <div class="world-banner__post" />
      </div>
    </div>
  );
}
