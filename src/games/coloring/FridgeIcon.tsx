// Picto du frigo (docs/specs/COLORIAGE.md §2.5), dans le même style que src/ui/icons/Icon.tsx :
// aplats, un reflet clair, pas de contour noir. Composant à part (le frigo n'est pas un picto
// d'interface générique comme ceux de la barre d'onglets parent).
export function FridgeIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <rect x={7} y={2} width={22} height={32} rx={4} fill="#cfe3ee" />
      <rect x={7} y={2} width={22} height={11} rx={4} fill="#e7f3f8" />
      <rect x={10} y={15} width={3} height={10} rx={1.5} fill="#8fb9cc" />
      <rect x={10} y={4} width={3} height={6} rx={1.5} fill="#8fb9cc" />
    </svg>
  );
}
