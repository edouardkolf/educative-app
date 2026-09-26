// Vue de la mécanique « comparer » (CE1) : deux cartes, une case centrale, trois boutons < = >.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import type { CompareRoundData, Side } from './types';
import './compare.css';

const SYMBOLS: Record<'lt' | 'eq' | 'gt', string> = { lt: '<', eq: '=', gt: '>' };
const BUTTON_ORDER = ['lt', 'eq', 'gt'] as const;

function SideCard({ side, bigger }: { side: Side; bigger: boolean }) {
  return (
    <div class={`cmp-card${bigger ? ' cmp-card--bigger' : ''}`}>
      {side.terms.length === 1 ? (
        <span class="cmp-card__value">{side.terms[0]}</span>
      ) : (
        <span class="cmp-card__value cmp-card__value--sum">
          {side.terms[0]} + {side.terms[1]}
        </span>
      )}
    </div>
  );
}

export function CompareView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<CompareRoundData>) {
  const { left, right } = round.data;

  // Ne fait trembler que le bouton qui VIENT d'être marqué faux (comme SequenceView/CountView).
  const [shaking, setShaking] = useState<ChoiceId | null>(null);
  const previousWrong = useRef<ReadonlySet<ChoiceId>>(new Set());

  useEffect(() => {
    let justWrong: ChoiceId | null = null;
    for (const id of wrongChoices) {
      if (!previousWrong.current.has(id)) {
        justWrong = id;
        break;
      }
    }
    previousWrong.current = wrongChoices;
    if (justWrong === null) return undefined;
    setShaking(justWrong);
    const timer = setTimeout(() => setShaking((current) => (current === justWrong ? null : current)), 320);
    return () => clearTimeout(timer);
  }, [wrongChoices]);

  const handleChoose = (id: ChoiceId) => {
    if (solved) return;
    onChoose(id);
  };

  // Indice visuel à la réussite : le côté le plus grand ressort un peu (jamais à égalité).
  const leftBigger = solved && round.answer === 'gt';
  const rightBigger = solved && round.answer === 'lt';

  return (
    <div class="cmp-view" data-answer={round.answer}>
      <div class="cmp-row">
        <SideCard side={left} bigger={leftBigger} />
        <div class={`cmp-slot${solved ? ' cmp-slot--filled' : ''}`}>
          {solved ? SYMBOLS[round.answer as 'lt' | 'eq' | 'gt'] : null}
        </div>
        <SideCard side={right} bigger={rightBigger} />
      </div>

      <div class="cmp-choices">
        {BUTTON_ORDER.map((id) => {
          const isWrong = wrongChoices.has(id);
          const isCorrectAndSolved = solved && id === round.answer;
          const classes = [
            'cmp-choice',
            isWrong ? 'cmp-choice--wrong' : '',
            shaking === id ? 'cmp-choice--shake' : '',
            isCorrectAndSolved ? 'cmp-choice--bounce' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={id}
              type="button"
              class={classes}
              data-choice={id}
              disabled={isWrong || solved}
              onClick={() => handleChoose(id)}
            >
              {SYMBOLS[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
