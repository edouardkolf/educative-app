// Picto d'un niveau du parcours : la lettre elle-même pour les niveaux « lettres », un dessin par jeu sinon.
import { Emoji } from '../../ui/Emoji';
import { getGrapheme, keywordPicture } from './curriculum';
import type { LevelTrack, ReadingLevel } from './levels';
import { STAGE_COLORS, StageIcon, type StageColors } from './StageIcon';

/** Une couleur par piste : bleu = j'écoute, rose = les lettres, vert = j'assemble, orange = je lis. */
export const TRACK_COLORS: Record<LevelTrack, StageColors> = {
  ear: STAGE_COLORS[1],
  letters: STAGE_COLORS[2],
  blend: STAGE_COLORS[3],
  read: STAGE_COLORS[5],
};

function Drum() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false" class="rd-stage-icon">
      <path d="M22 6L31 22M42 6L33 22" fill="none" stroke="#a9713a" stroke-width="4" stroke-linecap="round" />
      <path d="M8 28V46C8 53 19 58 32 58S56 53 56 46V28Z" fill="#ef6b5b" stroke="#b84434" stroke-width="3" stroke-linejoin="round" />
      <path d="M12 32L19 52L26 34L32 54L38 34L45 52L52 32" fill="none" stroke="#fde3c8" stroke-width="3" stroke-linejoin="round" />
      <ellipse cx="32" cy="28" rx="24" ry="9" fill="#fbf2dc" stroke="#d09a26" stroke-width="4" />
    </svg>
  );
}

export function LevelIcon({ level }: { level: ReadingLevel }) {
  switch (level.game) {
    case 'letter-sound':
    case 'first-sound': {
      const id = level.item.slice(2);
      const glyph = getGrapheme(id)?.upper ?? id.toUpperCase();
      const emoji = level.game === 'first-sound' ? keywordPicture(id)?.emoji : undefined;
      return (
        <span class={`rd-glyph${glyph.length > 1 ? ' rd-glyph--wide' : ''}${emoji ? ' rd-glyph--pic' : ''}`}>
          <span class="rd-glyph__text">{glyph}</span>
          {emoji && <Emoji char={emoji} class="rd-glyph__emoji" />}
        </span>
      );
    }
    case 'syllable-drum':
      return <Drum />;
    case 'same-start':
      return <StageIcon stage={1} />;
    case 'same-end':
      return <StageIcon stage={2} />;
    case 'syllable-machine':
      return <StageIcon stage={3} />;
    case 'mystery-word':
      return <StageIcon stage={5} />;
    case 'letter-twins':
      return (
        <span class="rd-glyph rd-glyph--wide">
          <span class="rd-glyph__text">Aa</span>
        </span>
      );
  }
}
