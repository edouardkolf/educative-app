// Écran de choix (docs/specs/COLORIAGE.md §2.2) : jusqu'à 3 cartes montrant la vignette du dessin au
// trait, sans codes. La carte de reprise montre ses cases déjà peintes.
import { DrawingView } from './DrawingView';
import type { Detail, Drawing } from './model';
import type { Color } from '../../engine/types';
import type { ColoringTier } from '../../storage/colorings';
import './coloring-screen.css';

export interface ChoiceCard {
  drawing: Drawing;
  detail: Detail;
  tier: ColoringTier;
  targets: readonly { id: string; target: Color }[];
  painted: ReadonlySet<string>;
  /** Vrai pour la carte de reprise (docs/specs/COLORIAGE.md §2.2, §3.6). */
  isResume: boolean;
}

const CARD_PX = 128;

export interface ChoiceBoardProps {
  cards: readonly ChoiceCard[];
  onPick: (index: number) => void;
}

export function ChoiceBoard({ cards, onPick }: ChoiceBoardProps) {
  return (
    <div class="clr-choice-board">
      {cards.map((card, index) => (
        <button
          key={card.drawing.id}
          type="button"
          class="clr-choice-card"
          data-choice={card.isResume ? 'pick-resume' : `pick-${card.drawing.id}`}
          onClick={() => onPick(index)}
        >
          <DrawingView
            drawing={card.drawing}
            detail={card.detail}
            tier={card.tier}
            targets={card.targets}
            legend={null}
            painted={card.painted}
            hints={{}}
            transient={null}
            celebrating={false}
            reducedMotion={false}
            sizePx={CARD_PX}
            interactive={false}
            onZoneTap={() => {}}
            showCodes={false}
          />
        </button>
      ))}
    </div>
  );
}
