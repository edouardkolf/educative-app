// Pictos des cinq étapes (LECTURE.md §2) : dessinés en SVG, aplats sans contour noir, comme les pictos d'interface.
// 1 oreille, 2 bouche qui chante, 3 lettre et serpentin de son, 4 lettre et éclair, 5 livre ouvert.
import type { JSX } from 'preact';
import type { ReadingStage } from './types';

export interface StageColors {
  main: string;
  soft: string;
  dark: string;
}

export const STAGE_COLORS: Record<ReadingStage, StageColors> = {
  1: { main: '#3fa7ee', soft: '#dff1ff', dark: '#1d6fae' },
  2: { main: '#ff6f83', soft: '#ffe3e8', dark: '#c23a54' },
  3: { main: '#4fbd63', soft: '#e0f6e3', dark: '#2b8a40' },
  4: { main: '#9a78e8', soft: '#ece6fb', dark: '#6a47c0' },
  5: { main: '#ffa62b', soft: '#fff0d4', dark: '#c47608' },
};

const DRAWINGS: Record<ReadingStage, () => JSX.Element> = {
  1: () => (
    <>
      <ellipse cx="40" cy="31" rx="14" ry="20" fill="#ffc9a3" stroke="#e8935f" stroke-width="3" />
      <path
        d="M40 17.5C32.5 17.5 31.5 27.5 36 31.5C40 35 39 40.5 35 42.5"
        fill="none"
        stroke="#e8935f"
        stroke-width="3.4"
        stroke-linecap="round"
      />
      <ellipse cx="44" cy="49" rx="5" ry="5.5" fill="#ffb487" />
      <path d="M24 24Q19 31 24 38" fill="none" stroke="#3fa7ee" stroke-width="3.6" stroke-linecap="round" />
      <path d="M16 19Q9 31 16 43" fill="none" stroke="#3fa7ee" stroke-width="3.6" stroke-linecap="round" />
    </>
  ),
  2: () => (
    <>
      <ellipse cx="30" cy="37" rx="19" ry="15" fill="#ff5d73" />
      <ellipse cx="30" cy="37" rx="11" ry="9" fill="#7a1530" />
      <ellipse cx="30" cy="42" rx="6.5" ry="4" fill="#ff8fa3" />
      <path d="M17 30Q30 22 43 30" fill="none" stroke="#ff9aa9" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="48" cy="21" r="4.5" fill="#6a47c0" />
      <path d="M52.2 21V7Q59 8 58 15" fill="none" stroke="#6a47c0" stroke-width="3" stroke-linecap="round" />
    </>
  ),
  3: () => (
    <>
      <path d="M12 10H24V40H34V51H12Z" fill="#2b8a40" stroke="#2b8a40" stroke-width="2" stroke-linejoin="round" />
      <path d="M34 26q4-9 8 0t8 0t8 0" fill="none" stroke="#4fbd63" stroke-width="3.6" stroke-linecap="round" />
      <path d="M38 38q3-7 6 0t6 0t6 0" fill="none" stroke="#9ad9a5" stroke-width="3.2" stroke-linecap="round" />
    </>
  ),
  4: () => (
    <>
      <path
        d="M10 10H27A12 12 0 0 1 27 34H22V52H10Z M22 19.5H27A2.5 2.5 0 0 1 27 24.5H22Z"
        fill="#6a47c0"
        fill-rule="evenodd"
        stroke="#6a47c0"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <polygon
        points="46,8 36,32 44,32 40,56 58,26 49,26 56,8"
        fill="#ffc53d"
        stroke="#f2a516"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </>
  ),
  5: () => (
    <>
      <path d="M4 53Q19 47 32 54Q45 47 60 53V58Q45 52 32 59Q19 52 4 58Z" fill="#e0861c" />
      <path d="M6 16Q19 11 32 17V54Q19 48 6 53Z" fill="#fffdf7" stroke="#c47608" stroke-width="3" stroke-linejoin="round" />
      <path d="M58 16Q45 11 32 17V54Q45 48 58 53Z" fill="#ffffff" stroke="#c47608" stroke-width="3" stroke-linejoin="round" />
      <path
        d="M12 25Q19 23 26 26M12 33Q19 31 26 34M12 41Q19 39 26 42M38 26Q45 23 52 25M38 34Q45 31 52 33M38 42Q45 39 52 41"
        fill="none"
        stroke="#ffb347"
        stroke-width="2.4"
        stroke-linecap="round"
      />
    </>
  ),
};

interface StageIconProps {
  stage: ReadingStage;
  size?: number | string;
}

export function StageIcon({ stage, size = '100%' }: StageIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" class={`rd-stage-icon rd-stage-icon--${stage}`}>
      {DRAWINGS[stage]()}
    </svg>
  );
}
