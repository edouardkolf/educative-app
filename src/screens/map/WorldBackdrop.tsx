// Fond d'une partie : le monde en cours vu de près (dessiné par son module, scenery/*.tsx), sous
// un voile blanc qui le laisse deviner sans voler l'attention à l'exercice. Purement décoratif.
import { BACKDROP_HEIGHT, BACKDROP_WIDTH, type WorldId } from './layout';
import { SCENES } from './scenery';

interface Props {
  world: WorldId;
  /** `soft` : voile plus léger (écran des étoiles, rien à lire ni à viser). */
  veil?: 'focus' | 'soft';
}

export function WorldBackdrop({ world, veil = 'focus' }: Props) {
  const { Backdrop } = SCENES[world];
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
        <Backdrop />
      </svg>
      <div class="world-backdrop__veil" />
    </div>
  );
}
