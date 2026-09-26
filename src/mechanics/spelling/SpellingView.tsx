// Vue de la mécanique « orthographe » (CE1, enfant lecteur débutant). Gros texte, fort contraste.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import type { GapRoundData, PickRoundData, SpellingRoundData, TilesRoundData } from './types';
import './spelling.css';

// ---------- Voix (haut-parleur) ----------

function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function speak(text: string) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.8;
  const frVoice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'));
  if (frVoice) utterance.voice = frVoice;
  synth.cancel(); // ne jamais empiler plusieurs lectures si l'enfant retape vite
  synth.speak(utterance);
}

/** Bouton 🔊 (≥ 56 px), absent si la synthèse vocale n'est pas disponible. Pas de data-choice : ne compte pas comme une réponse. */
function SpeakButton({ text }: { text: string }) {
  if (!speechAvailable()) return null;
  return (
    <button type="button" class="spl-speak" aria-label="Écouter le mot" onClick={() => speak(text)}>
      🔊
    </button>
  );
}

/** Texte à lire : la phrase complète (mot inséré) si elle est affichée, sinon le mot seul. */
function speechTextFor(word: string, sentence?: string): string {
  return sentence ? sentence.replace('___', word) : word;
}

/** Phrase avec un trou visuel à la place de « ___ » (suppose exactement une occurrence). */
function SentenceWithHole({ sentence }: { sentence: string }) {
  const [before, after] = sentence.split('___');
  return (
    <p class="spl-sentence">
      {before}
      <span class="spl-hole" aria-label="mot manquant" />
      {after}
    </p>
  );
}

/** Fait trembler, un court instant, le choix qui vient d'être ajouté à `wrongChoices`. */
function useJustWrongShake(wrongChoices: ReadonlySet<ChoiceId>): ChoiceId | null {
  const [shaking, setShaking] = useState<ChoiceId | null>(null);
  const previous = useRef<ReadonlySet<ChoiceId>>(new Set());

  useEffect(() => {
    let justWrong: ChoiceId | null = null;
    for (const id of wrongChoices) {
      if (!previous.current.has(id)) {
        justWrong = id;
        break;
      }
    }
    previous.current = wrongChoices;
    if (justWrong === null) return undefined;
    setShaking(justWrong);
    const timer = setTimeout(() => setShaking((current) => (current === justWrong ? null : current)), 320);
    return () => clearTimeout(timer);
  }, [wrongChoices]);

  return shaking;
}

// ---------- Mode "pick" ----------

function PickView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<SpellingRoundData>) {
  const { data } = round;
  if (data.mode !== 'pick') return null;
  const shaking = useJustWrongShake(wrongChoices);

  return (
    <div class="spl-view" data-answer={round.answer}>
      {data.sentence && <SentenceWithHole sentence={data.sentence} />}
      <SpeakButton text={speechTextFor(data.word, data.sentence)} />
      <div class="spl-choices">
        {data.choices.map(({ id, text }) => {
          const isWrong = wrongChoices.has(id);
          const classes = [
            'spl-choice',
            isWrong ? 'spl-choice--wrong' : '',
            shaking === id ? 'spl-choice--shake' : '',
            solved && id === round.answer ? 'spl-choice--bounce' : '',
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
              onClick={() => onChoose(id)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Mode "gap" ----------

function GapView({ round, wrongChoices, solved, onChoose }: MechanicViewProps<SpellingRoundData>) {
  const { data } = round;
  if (data.mode !== 'gap') return null;
  const shaking = useJustWrongShake(wrongChoices);

  return (
    <div class="spl-view" data-answer={round.answer}>
      {data.sentence && <SentenceWithHole sentence={data.sentence} />}
      <SpeakButton text={speechTextFor(data.word, data.sentence)} />
      <div class="spl-word">
        {solved ? (
          <span class="spl-word__full">{data.word}</span>
        ) : (
          <>
            <span>{data.before}</span>
            <span class="spl-gap-hole">▢</span>
            <span>{data.after}</span>
          </>
        )}
      </div>
      <div class="spl-choices">
        {data.choices.map(({ id, text }) => {
          const isWrong = wrongChoices.has(id);
          const classes = [
            'spl-choice',
            isWrong ? 'spl-choice--wrong' : '',
            shaking === id ? 'spl-choice--shake' : '',
            solved && id === round.answer ? 'spl-choice--bounce' : '',
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
              onClick={() => onChoose(id)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Mode "tiles" ----------

function TilesView({ round, solved, onChoose }: MechanicViewProps<SpellingRoundData>) {
  const { data } = round;
  if (data.mode !== 'tiles') return null;
  const { letters, tiles, apostropheAfterIndex, word, sentence } = data;

  // Une case par lettre : `placed[i]` = index de l'étiquette posée dans `tiles`, ou null si vide.
  const [placed, setPlaced] = useState<(number | null)[]>(() => letters.map(() => null));
  const [shake, setShake] = useState(false);

  const usedIndices = new Set(placed.filter((v): v is number => v !== null));
  const allFilled = placed.every((v) => v !== null);

  const placeInFirstEmpty = (tileIndex: number) => {
    if (solved) return;
    setPlaced((prev) => {
      const emptyPos = prev.indexOf(null);
      if (emptyPos === -1) return prev;
      const next = [...prev];
      next[emptyPos] = tileIndex;
      return next;
    });
  };

  const clearBox = (boxIndex: number) => {
    if (solved) return;
    setPlaced((prev) => prev.map((v, i) => (i === boxIndex ? null : v)));
  };

  const validate = () => {
    if (solved || shake || !allFilled) return;
    // L'apostrophe d'aujourd'hui est déjà posée à l'affichage : on la réinsère pour comparer au mot exact.
    const composed = placed
      .map((i, k) => tiles[i as number] + (k === apostropheAfterIndex ? "'" : ''))
      .join('');
    const isCorrect = composed === round.answer;
    onChoose(composed);
    if (!isCorrect) {
      setShake(true);
      window.setTimeout(() => {
        setShake(false);
        setPlaced(letters.map(() => null)); // les étiquettes reviennent au plateau
      }, 320);
    }
  };

  return (
    <div class="spl-view" data-answer={round.answer}>
      {sentence && <SentenceWithHole sentence={sentence} />}
      <SpeakButton text={speechTextFor(word, sentence)} />

      <div class={`spl-tiles-word${shake ? ' spl-tiles-word--shake' : ''}`}>
        {solved ? (
          <span class="spl-word__full">{word}</span>
        ) : (
          letters.map((_, boxIndex) => (
            <span class="spl-box-wrap" key={boxIndex}>
              <button
                type="button"
                class="spl-box"
                onClick={() => clearBox(boxIndex)}
                disabled={placed[boxIndex] === null}
              >
                {placed[boxIndex] !== null ? tiles[placed[boxIndex] as number] : '\u00a0'}
              </button>
              {apostropheAfterIndex === boxIndex && <span class="spl-apostrophe">’</span>}
            </span>
          ))
        )}
      </div>

      {!solved && (
        <div class="spl-board">
          {tiles.map((letter, i) => (
            <button
              key={i}
              type="button"
              class="spl-tile"
              data-choice={`tile-${i}`}
              disabled={shake || usedIndices.has(i)}
              onClick={() => placeInFirstEmpty(i)}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        class="spl-validate"
        data-choice="tiles-ok"
        disabled={solved || shake || !allFilled}
        onClick={validate}
      >
        ✓
      </button>
    </div>
  );
}

// ---------- Aiguillage ----------

export function SpellingView(props: MechanicViewProps<SpellingRoundData>) {
  const { round } = props;
  if (round.data.mode === 'pick') return <PickView {...props} />;
  if (round.data.mode === 'gap') return <GapView {...props} />;
  return <TilesView {...props} />;
}

export type { PickRoundData, GapRoundData, TilesRoundData };
