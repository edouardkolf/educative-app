// Une tuile du hub (docs/specs/HUB.md §2.1, §2.2) : bouton plein, sans texte visible (`aria-label`
// pour les lecteurs d'écran et les tests). `badge` est réservé au badge d'indisponibilité en V1 ; la
// place est prête pour le futur « rythme de la carte » (§2.2 : ni texte ni chiffre).
import type { ComponentChildren, JSX } from 'preact';

interface HubTileProps {
  testId: string;
  ariaLabel: string;
  world?: string;
  state?: 'ready' | 'checking' | 'unavailable';
  onClick: () => void;
  badge?: ComponentChildren;
  children: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

export function HubTile({ testId, ariaLabel, world, state, onClick, badge, children, class: extraClass, style }: HubTileProps) {
  return (
    <button
      type="button"
      class={`hub-tile${extraClass ? ` ${extraClass}` : ''}`}
      style={style}
      data-testid={testId}
      data-world={world}
      data-state={state}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
      {badge !== undefined && (
        <span class="hub-tile__badge" aria-hidden="true">
          {badge}
        </span>
      )}
    </button>
  );
}
