// Rangée d'étoiles réutilisable : petite sur la carte, grande et animée en fin de niveau.
interface StarRowProps {
  count: 0 | 1 | 2 | 3;
  size?: number;
  total?: number;
  /** Anime (pop) chaque étoile qui vient de se remplir (fin de niveau). */
  animated?: boolean;
}

export function StarRow({ count, size = 20, total = 3, animated = false }: StarRowProps) {
  return (
    <div class={`star-row${animated ? ' star-row--animated' : ''}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          class={`star-row__star${i < count ? ' is-filled' : ''}`}
          style={{ fontSize: size }}
          aria-hidden="true"
        >
          {i < count ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  );
}
