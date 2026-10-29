// Pictos du memory (viewBox 48), à brancher dans MechanicIcon / GameIcon : aplats, un reflet, pas de contour noir.
// Deux cartes retournées montrant la même pomme, et une carte de dos.
import type { JSX } from 'preact';

const SHADOW = 'rgba(61, 44, 30, 0.14)';

function Apple({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M7 4.5Q9 2 11 3" fill="none" stroke="#6b8e23" stroke-width="1.6" stroke-linecap="round" />
      <path d="M8.5 3.2Q11 0.6 13.5 1.6Q12 4 9.2 4Z" fill="#5fb85a" />
      <path d="M7 4.8C4 3.4 1 5.4 1 9.4C1 14 4 17 6.2 17C7 17 7.4 16.6 8 16.6C8.6 16.6 9 17 9.8 17C12 17 15 14 15 9.4C15 5.4 12 3.4 9 4.8Q8 5.3 7 4.8Z" fill="#e63946" />
      <path d="M3.6 8Q4 6.4 5.4 6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.7" />
    </g>
  );
}

export function memoryMechanicIcon(): JSX.Element {
  return (
    <>
      <ellipse cx="24" cy="43" rx="19" ry="2.5" fill={SHADOW} />
      <rect x="3" y="12" width="17" height="24" rx="3.5" fill="#fffdf7" stroke="#e6dcc4" stroke-width="1.5" />
      <Apple x={4} y={17} />
      <rect x="22" y="12" width="17" height="24" rx="3.5" fill="#fffdf7" stroke="#e6dcc4" stroke-width="1.5" />
      <Apple x={23} y={17} />
      <g transform="rotate(10 40 30)">
        <rect x="32" y="14" width="14" height="22" rx="3.5" fill="#8a7ce8" stroke="#fff" stroke-width="1.5" />
        <path d="M39 20l1.6 3.6 3.8.4-2.9 2.5.9 3.8-3.4-2-3.4 2 .9-3.8-2.9-2.5 3.8-.4z" fill="#fff6c9" />
        <path d="M34.5 17.5H38" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
      </g>
    </>
  );
}

export function memoryGameIcon(): JSX.Element {
  return memoryMechanicIcon();
}
