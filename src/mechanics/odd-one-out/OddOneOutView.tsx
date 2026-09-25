// Vue de la mécanique « trouver l'intrus ». Aucun texte : formes, émojis, couleurs, animations.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import { Shape } from '../../ui/Shape';
import { getObject } from '../../ui/objects';
import type { OddOneOutRoundData } from './types';
import './odd-one-out.css';

/** 3 → une ligne ; 4 → 2×2 ; 5-6 → 3 colonnes. */
function gridColumns(count: number): 2 | 3 {
  return count === 4 ? 2 : 3;
}

export function OddOneOutView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<OddOneOutRoundData>) {
  const { items } = round.data;
  const columns = gridColumns(items.length);

  // Détecte le choix qui VIENT d'être marqué faux pour ne le faire trembler qu'une fois.
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

  return (
    <div class="ooo-view" data-answer={round.answer}>
      <div class={`ooo-grid ooo-grid--cols-${columns}`}>
        {items.map((item) => {
          const isWrong = wrongChoices.has(item.id);
          const isAnswer = item.id === round.answer;
          const classes = [
            'ooo-choice',
            isWrong ? 'ooo-choice--wrong' : '',
            shaking === item.id ? 'ooo-choice--shake' : '',
            solved && isAnswer ? 'ooo-choice--solved' : '',
            solved && !isAnswer && !isWrong ? 'ooo-choice--dim' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={item.id}
              type="button"
              class={classes}
              data-choice={item.id}
              disabled={isWrong || solved}
              onClick={() => handleChoose(item.id)}
            >
              {item.kind === 'token' ? (
                <Shape shape={item.token.shape} color={item.token.color} size={64} />
              ) : (
                <span class="ooo-emoji" aria-hidden="true">
                  {getObject(item.objectId)?.emoji}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
