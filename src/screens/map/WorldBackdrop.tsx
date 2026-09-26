// Fond d'une partie : le monde en cours vu de près (mêmes sol et dessins que sur la carte), sous
// un voile blanc qui le laisse deviner sans voler l'attention à l'exercice. Purement décoratif.
import { useMemo } from 'preact/hooks';
import { BACKDROP_HEIGHT, BACKDROP_WIDTH, backdropDecor, type WorldId } from './layout';
import { Sprite, THEMES } from './MapScenery';

interface Props {
  world: WorldId;
  /** `soft` : voile plus léger (écran des étoiles, rien à lire ni à viser). */
  veil?: 'focus' | 'soft';
}

export function WorldBackdrop({ world, veil = 'focus' }: Props) {
  const decor = useMemo(() => backdropDecor(world), [world]);
  const theme = THEMES[world];
  return (
    <div
      class={`world-backdrop world-backdrop--${veil}`}
      data-world={world}
      data-testid="world-backdrop"
      aria-hidden="true"
    >
      <svg
        class="world-backdrop__scene"
        viewBox={`0 0 ${BACKDROP_WIDTH} ${BACKDROP_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="0" y="0" width={BACKDROP_WIDTH} height={BACKDROP_HEIGHT} fill={theme.ground} />
        <ellipse cx={BACKDROP_WIDTH * 0.2} cy={BACKDROP_HEIGHT * 0.3} rx="170" ry="90" fill={theme.patch} />
        <ellipse cx={BACKDROP_WIDTH * 0.85} cy={BACKDROP_HEIGHT * 0.72} rx="190" ry="100" fill={theme.patch} />
        {decor.map((item, i) => (
          <g
            key={i}
            transform={`translate(${Math.round(item.x)} ${Math.round(item.y)}) scale(${
              item.flip ? -item.scale : item.scale
            } ${item.scale})`}
          >
            <Sprite kind={item.kind} seed={i} />
          </g>
        ))}
      </svg>
      <div class="world-backdrop__veil" />
    </div>
  );
}
