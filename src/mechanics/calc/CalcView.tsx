// Vue de la mécanique « calcul ». Aucun texte : chiffres, signes, quadrillage de points.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceId, MechanicViewProps } from '../../engine/types';
import type { CalcRoundData } from './types';
import './calc.css';

const OP_SYMBOL: Record<CalcRoundData['operation'], string> = { add: '+', sub: '−', mul: '×' };
const MAX_KEYPAD_DIGITS = 3;
const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SHAKE_MS = 320;

/** Ligne de l'opération, en très gros chiffres ; la case inconnue pulse et affiche ce qui est tapé (keypad). */
function OperationDisplay({ data, typed }: { data: CalcRoundData; typed: string }) {
  const { operation, a, b, result, unknown } = data;
  const symbol = OP_SYMBOL[operation];
  const rightIsUnknown = unknown === 'operand';
  const resultIsUnknown = unknown === 'result';
  const rightText = rightIsUnknown ? typed : String(b);
  const resultText = resultIsUnknown ? typed : String(result);

  return (
    <div class="calc-op">
      <span class="calc-op__num">{a}</span>
      <span class="calc-op__sign">{symbol}</span>
      <span class={`calc-op__num${rightIsUnknown ? ' calc-op__num--blank' : ''}`}>{rightText || '?'}</span>
      <span class="calc-op__sign">=</span>
      <span class={`calc-op__num${resultIsUnknown ? ' calc-op__num--blank' : ''}`}>{resultText || '?'}</span>
    </div>
  );
}

/** Quadrillage a rangées × b colonnes, uniquement en soutien visuel (data.showArray déjà filtré côté generate). */
function ArrayGrid({ a, b }: { a: number; b: number }) {
  const cells = Array.from({ length: a * b });
  return (
    <div class="calc-array" style={{ gridTemplateColumns: `repeat(${b}, 1fr)` }}>
      {cells.map((_, i) => (
        <span key={i} class="calc-array__dot" />
      ))}
    </div>
  );
}

function ChoicesPad({ round, wrongChoices, solved, onChoose }: MechanicViewProps<CalcRoundData>) {
  const choices = round.data.choices ?? [];
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
    const timer = setTimeout(() => setShaking((current) => (current === justWrong ? null : current)), SHAKE_MS);
    return () => clearTimeout(timer);
  }, [wrongChoices]);

  return (
    <div class={choices.length === 4 ? 'calc-choices calc-choices--grid-4' : 'calc-choices'}>
      {choices.map(({ id, value }) => {
        const isWrong = wrongChoices.has(id);
        const isCorrectAndSolved = solved && id === round.answer;
        const classes = [
          'calc-choice',
          isWrong ? 'calc-choice--wrong' : '',
          shaking === id ? 'calc-choice--shake' : '',
          isCorrectAndSolved ? 'calc-choice--bounce' : '',
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
            onClick={() => !solved && onChoose(id)}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

/** Pavé numérique enfant : chiffres, effacer, valider. Faux (même resoumis à l'identique) → tremble puis se vide. */
function Keypad({
  round,
  solved,
  onChoose,
  typed,
  setTyped,
  shaking,
  setShaking,
}: MechanicViewProps<CalcRoundData> & {
  typed: string;
  setTyped: (updater: (current: string) => string) => void;
  shaking: boolean;
  setShaking: (value: boolean) => void;
}) {
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (clearTimer.current !== null) clearTimeout(clearTimer.current);
    },
    [],
  );

  const appendDigit = (digit: string) => {
    if (solved || shaking) return;
    setTyped((current) => {
      if (current.length >= MAX_KEYPAD_DIGITS) return current;
      if (current === '0') return current; // pas de zéro en tête (mais « 0 » seul est une réponse possible)
      return current + digit;
    });
  };

  const removeDigit = () => {
    if (solved || shaking) return;
    setTyped((current) => current.slice(0, -1));
  };

  const submit = () => {
    if (solved || shaking || typed === '') return;
    const value = typed;
    // Faux même resoumis à l'identique : l'animation est locale, indépendante de wrongChoices
    // (le Set ne change pas de contenu quand on retape le même nombre faux).
    if (value !== round.answer) {
      setShaking(true);
      clearTimer.current = setTimeout(() => {
        setShaking(false);
        setTyped(() => '');
      }, SHAKE_MS);
    }
    onChoose(value);
  };

  return (
    <div class="calc-keypad">
      <div class="calc-keypad__grid">
        {KEYPAD_DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            class="calc-key"
            data-choice={`key-${digit}`}
            disabled={solved}
            onClick={() => appendDigit(digit)}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          class="calc-key calc-key--del"
          data-choice="key-del"
          disabled={solved || typed === ''}
          onClick={removeDigit}
        >
          ⌫
        </button>
        <button
          type="button"
          class="calc-key calc-key--ok"
          data-choice="key-ok"
          disabled={solved || shaking || typed === ''}
          onClick={submit}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

export function CalcView(props: MechanicViewProps<CalcRoundData>) {
  const { round, data } = { ...props, data: props.round.data };
  const [typed, setTyped] = useState('');
  const [shaking, setShaking] = useState(false);

  // Nouvelle manche : la case repart vide.
  useEffect(() => {
    setTyped('');
    setShaking(false);
  }, [round]);

  return (
    <div class="calc-view" data-answer={round.answer}>
      <div class={`calc-op-wrap${shaking ? ' calc-op-wrap--shake' : ''}`}>
        <OperationDisplay data={data} typed={data.answerMode === 'keypad' ? typed : ''} />
      </div>
      {data.showArray && (!data.arrayAfterError || props.wrongChoices.size > 0) ? (
        <ArrayGrid a={data.a} b={data.b} />
      ) : null}
      {data.answerMode === 'choices' ? (
        <ChoicesPad {...props} />
      ) : (
        <Keypad {...props} typed={typed} setTyped={setTyped} shaking={shaking} setShaking={setShaking} />
      )}
    </div>
  );
}
