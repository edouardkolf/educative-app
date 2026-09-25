// Bouton rond à picto, taille et variante réglables. Utilisé pour toute la navigation enfant.
import type { ComponentChildren } from 'preact';

interface IconButtonProps {
  onClick: () => void;
  children: ComponentChildren;
  size?: number;
  variant?: 'default' | 'primary';
  disabled?: boolean;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function IconButton({ onClick, children, size = 56, variant = 'default', disabled = false, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      class={`icon-button icon-button--${variant}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
