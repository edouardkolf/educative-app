// Vue de la mécanique « compter des objets ». Aucun texte : émoji, chiffres, points.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import { getObject } from '../../ui/objects';
import { dotPositions } from './generate';
import type { CountRoundData } from './types';
import './count.css';

const POP_STEP_MS = 90; // délai entre chaque « pop » d'objet à la réussite, comme si on les recomptait

function DotCluster({ value, sizePx, dotPx }: { value: number; sizePx: number; dotPx: number }) {
  return (
    <div class="cnt-choice__dots" style={{ width: sizePx, height: sizePx }}>
      {dotPositions(value).map((p, i) => (
        <span
          key={i}
          class="cnt-choice__dot"
          style={{ width: dotPx, height: dotPx, left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        />
      ))}
    </div>
  );
}

function ChoiceContent({ value, answers }: { value: number; answers: CountRoundData['answers'] }) {
  if (answers === 'dots') return <DotCluster value={value} sizePx={64} dotPx={11} />;
  if (answers === 'digits+dots') {
    return (
      <>
        <span class="cnt-choice__digit cnt-choice__digit--small">{value}</span>
        <DotCluster value={value} sizePx={32} dotPx={7} />
      </>
    );
  }
  return <span class="cnt-choice__digit">{value}</span>;
}

export function CountView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<CountRoundData>) {
  const { objectId, layout, positions, choices, answers } = round.data;
  const emoji = getObject(objectId)?.emoji ?? '❔';

  // Aide au comptage (correspondance terme à terme) : purement locale, aucun effet sur le score.
  const [marked, setMarked] = useState<ReadonlySet<number>>(new Set());
  const toggleMark = (index: number) => {
    if (solved) return;
    setMarked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Ne fait trembler que le choix qui VIENT d'être marqué faux (comme SequenceView).
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
    <div class="cnt-view" data-answer={round.answer}>
      <div class={layout === 'dice' ? 'cnt-frame cnt-frame--dice' : 'cnt-frame'}>
        {positions.map((p, i) => (
          <button
            key={i}
            type="button"
            class={`cnt-object${marked.has(i) ? ' cnt-object--marked' : ''}${solved ? ' cnt-object--pop' : ''}`}
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              animationDelay: solved ? `${i * POP_STEP_MS}ms` : undefined,
            }}
            onClick={() => toggleMark(i)}
            disabled={solved}
            aria-hidden="true"
            tabIndex={-1}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* F13 : grille 2×2 régulière à 4 propositions (au lieu d'un flex qui retombait en 3 + 1). */}
      <div class={choices.length === 4 ? 'cnt-choices cnt-choices--grid-4' : 'cnt-choices'}>
        {choices.map(({ id, value }) => {
          const isWrong = wrongChoices.has(id);
          const isCorrectAndSolved = solved && id === round.answer;
          const classes = [
            'cnt-choice',
            isWrong ? 'cnt-choice--wrong' : '',
            shaking === id ? 'cnt-choice--shake' : '',
            isCorrectAndSolved ? 'cnt-choice--bounce' : '',
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
              <ChoiceContent value={value} answers={answers} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
