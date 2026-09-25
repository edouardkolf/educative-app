// Vue de la mécanique « compléter une suite ». Aucun texte : formes, couleurs, animations.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps, Token } from '../../engine/types';
import { Shape } from '../../ui/Shape';
import type { SequenceRoundData } from './types';
import './sequence.css';

interface Cell {
  token: Token | null;
  index: number;
}

export function SequenceView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<SequenceRoundData>) {
  const { items, blankIndex, choices } = round.data;
  const twoLines = items.length > 6;
  const half = Math.ceil(items.length / 2);
  const rows: Cell[][] = twoLines
    ? [
        items.slice(0, half).map((token, i) => ({ token, index: i })),
        items.slice(half).map((token, i) => ({ token, index: i + half })),
      ]
    : [items.map((token, i) => ({ token, index: i }))];

  const correctToken = choices.find((c) => c.id === round.answer)?.token ?? null;

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
    <div class="seq-view" data-answer={round.answer}>
      <div class={twoLines ? 'seq-strip seq-strip--wrap' : 'seq-strip'}>
        {rows.map((row) => (
          <div class="seq-row" key={row[0]?.index ?? 0}>
            {row.map(({ token, index }) => {
              const isBlank = index === blankIndex;
              return (
                <div
                  key={index}
                  class={
                    isBlank
                      ? `seq-cell seq-cell--blank${solved ? ' seq-cell--pop' : ''}`
                      : 'seq-cell'
                  }
                >
                  {token ? (
                    <Shape shape={token.shape} color={token.color} size={48} />
                  ) : solved && correctToken ? (
                    <Shape shape={correctToken.shape} color={correctToken.color} size={48} />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div class="seq-choices">
        {choices.map(({ id, token }) => {
          const isWrong = wrongChoices.has(id);
          const isCorrectAndSolved = solved && id === round.answer;
          const classes = [
            'seq-choice',
            isWrong ? 'seq-choice--wrong' : '',
            shaking === id ? 'seq-choice--shake' : '',
            isCorrectAndSolved ? 'seq-choice--bounce' : '',
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
              <Shape shape={token.shape} color={token.color} size={60} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
