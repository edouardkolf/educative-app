// La fleur du pendu : un pétale tombe à chaque lettre absente du mot. Remplace le bonhomme pendu
// (cadre « erreur douce », docs/specs/README.md §3.7) avec la même tension : combien de pétales restent ?
const PETAL_COLORS = ['#ff8fab', '#ffa8c0'];

export function Flower({ petals, fallen, found }: { petals: number; fallen: number; found: boolean }) {
  const left = Math.max(0, petals - fallen);
  return (
    <div class="hm-flower" data-testid="hm-flower" data-petals-left={left} aria-label={`${left} pétales restants`} role="img">
      <svg viewBox="0 0 120 140" class="hm-flower__svg" aria-hidden="true" focusable="false">
        <ellipse cx="60" cy="134" rx="30" ry="4" fill="rgba(61, 44, 30, 0.12)" />
        <path d="M60 66V132" stroke="#5aa469" stroke-width="5" stroke-linecap="round" />
        <path d="M60 112Q42 98 30 106Q44 120 60 116" fill="#7cc48a" />
        <path d="M60 98Q78 84 90 92Q76 106 60 102" fill="#7cc48a" />
        {Array.from({ length: petals }, (_, i) => {
          const angle = (360 / petals) * i;
          const isFallen = i >= left;
          return (
            <g key={i} transform={`rotate(${angle} 60 46)`}>
              <ellipse
                class={`hm-petal${isFallen ? ' hm-petal--fallen' : ''}`}
                cx="60"
                cy="22"
                rx="10"
                ry="17"
                fill={PETAL_COLORS[i % 2]}
                data-testid="hm-petal"
                data-fallen={isFallen ? 'true' : undefined}
              />
            </g>
          );
        })}
        <circle cx="60" cy="46" r="15" fill="#ffc53d" />
        <circle cx="55" cy="41" r="4" fill="#fff3c4" />
        <circle cx="54.5" cy="47" r="2" fill="#3d2c1e" />
        <circle cx="65.5" cy="47" r="2" fill="#3d2c1e" />
        {left === 0 ? (
          <path d="M54 55Q60 51 66 55" fill="none" stroke="#3d2c1e" stroke-width="2.2" stroke-linecap="round" />
        ) : (
          <path d={found ? 'M52 51Q60 60 68 51' : 'M54 52Q60 56.5 66 52'} fill="none" stroke="#3d2c1e" stroke-width="2.2" stroke-linecap="round" />
        )}
      </svg>
    </div>
  );
}
