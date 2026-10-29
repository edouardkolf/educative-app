// Picto de la mécanique « maze » (fragment SVG, viewBox 48) : un labyrinthe vu de dessus avec un chemin coloré.
// À brancher dans src/ui/icons/MechanicIcon.tsx par l'orchestrateur.
export const mazeMechanicIcon = () => (
  <>
    <rect x="6" y="6" width="36" height="36" rx="9" fill="#8fd49c" />
    <path d="M13 13H24V21H35V35H20V28H13" fill="none" stroke="#fff6dc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M13 13H24V21H35V35" fill="none" stroke="#ffb347" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="13" cy="13" r="2.6" fill="#e63946" />
    <circle cx="35" cy="35" r="2.6" fill="#1d7fd8" />
  </>
);
