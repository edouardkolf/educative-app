// Vue de la mécanique « Lis et montre » (CE1) : lire une phrase, puis taper l'image qui correspond.
// Pas de bouton haut-parleur : c'est un exercice de lecture. Les images n'apparaissent qu'après
// un court délai, pour que l'enfant lise la phrase avant de regarder (et de deviner).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import { Scene } from './Scene';
import type { ReadRoundData } from './types';
import './read.css';

const IMAGES_DELAY_MS = 1200;

export function ReadView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<ReadRoundData>) {
  const { text, choices } = round.data;

  // Les images ne sont pas tapables tant qu'elles n'ont pas fini d'apparaître.
  const [imagesReady, setImagesReady] = useState(false);
  useEffect(() => {
    setImagesReady(false);
    const timer = setTimeout(() => setImagesReady(true), IMAGES_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Ne fait trembler que le choix qui VIENT d'être marqué faux (comme les autres mécaniques).
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
    if (!imagesReady || solved) return;
    onChoose(id);
  };

  const gridClass =
    choices.length === 4 ? 'rd-choices rd-choices--grid-4' : 'rd-choices rd-choices--three';

  return (
    <div class="rd-view" data-answer={round.answer}>
      <p class="rd-text">{text}</p>

      <div class={gridClass}>
        {choices.map(({ id, scene }) => {
          const isWrong = wrongChoices.has(id);
          const isCorrectAndSolved = solved && id === round.answer;
          const classes = [
            'rd-choice',
            imagesReady ? 'rd-choice--ready' : '',
            isWrong ? 'rd-choice--wrong' : '',
            shaking === id ? 'rd-choice--shake' : '',
            isCorrectAndSolved ? 'rd-choice--bounce' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={id}
              type="button"
              class={classes}
              data-choice={id}
              disabled={!imagesReady || isWrong || solved}
              onClick={() => handleChoose(id)}
            >
              <Scene scene={scene} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
