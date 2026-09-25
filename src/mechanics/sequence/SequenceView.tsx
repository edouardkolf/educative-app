// Vue de la mécanique « compléter une suite ». Aucun texte : formes, couleurs, animations.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import { Shape } from '../../ui/Shape';
import { getObject } from '../../ui/objects';
import type { SequenceItem, SequenceRoundData } from './types';
import './sequence.css';

interface Cell {
  item: SequenceItem | null;
  index: number;
}

/** Rendu d'un élément de suite : forme SVG (token) ou émoji géant (object), même gabarit de case. */
function ItemView({ item, size }: { item: SequenceItem; size: number }) {
  if (item.kind === 'token') {
    return <Shape shape={item.token.shape} color={item.token.color} size={size} />;
  }
  return (
    <span class="seq-emoji" style={{ fontSize: size }} aria-hidden="true">
      {getObject(item.objectId)?.emoji}
    </span>
  );
}

export function SequenceView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<SequenceRoundData>) {
  const { items, blankIndex, choices } = round.data;
  const twoLines = items.length > 6;
  const half = Math.ceil(items.length / 2);
  const rows: Cell[][] = twoLines
    ? [
        items.slice(0, half).map((item, i) => ({ item, index: i })),
        items.slice(half).map((item, i) => ({ item, index: i + half })),
      ]
    : [items.map((item, i) => ({ item, index: i }))];

  const correctItem = choices.find((c) => c.id === round.answer)?.item ?? null;

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
            {row.map(({ item, index }) => {
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
                  {item ? (
                    <ItemView item={item} size={48} />
                  ) : solved && correctItem ? (
                    <ItemView item={correctItem} size={48} />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div class="seq-choices">
        {choices.map(({ id, item }) => {
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
              <ItemView item={item} size={60} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
