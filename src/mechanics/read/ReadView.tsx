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

  // Deux phrases → chaque image empile deux mini-scènes (voir Scene.tsx) : la case est plus haute,
  // on le signale en CSS pour que la grille lui laisse la place plutôt que de l'écraser.
  const isSplit = (choices[0]?.scene.placements.length ?? 0) > 1;
  const gridClass = [
    'rd-choices',
    choices.length === 4 ? 'rd-choices--grid-4' : 'rd-choices--three',
    isSplit ? 'rd-choices--split' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div class="rd-view" data-answer={round.answer}>
      <p class="rd-text">{text}</p>

      <div class={gridClass}>
        {choices.map(({ id, scene }) => {
          const isWrong = wrongChoices.has(id);
          const isCorrectAndSolved = solved && id === round.answer;
          const classes = [
            'rd-choice',
            isSplit ? 'rd-choice--split' : '',
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
