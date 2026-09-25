// Vue « color-mix » : le laboratoire des couleurs. Aucun texte : fioles, chaudron, gouttes, bulles.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Color, MechanicViewProps } from '../../engine/types';
import { COLOR_HEX } from '../../ui/palette';
import { playBubble, playDrain, playPour } from '../../ui/sound';
import { mixColors, PRIMARY_FLASKS, recipeFor } from './generate';
import type { ColorMixRoundData } from './types';
import './color-mix.css';

/** Objet géant qui jaillit du chaudron, un par couleur possible (résultat d'un mélange ou primaire pur). */
const OBJECT_FOR_COLOR: Record<Color, string> = {
  red: '🍎',
  yellow: '🍌',
  blue: '🫐',
  orange: '🥕',
  green: '🐸',
  purple: '🍇',
};

const MIX_MS = 1000; // bulles avant la révélation
const WRONG_REVEAL_MS = 1500; // objet visible avant de vider le chaudron (erreur : pas punitif)
const DRAIN_MS = 700; // le chaudron se vide

type Phase = 'idle' | 'mixing' | 'revealed-correct' | 'revealed-wrong' | 'draining';

export function ColorMixView({ round, solved, onChoose }: MechanicViewProps<ColorMixRoundData>) {
  const { target } = round.data;
  const [poured, setPoured] = useState<Color[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealColor, setRevealColor] = useState<Color | null>(null);
  const [drop, setDrop] = useState<{ key: number; color: Color } | null>(null);

  const timersRef = useRef<number[]>([]);
  const dropKeyRef = useRef(0);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const handleFlaskTap = (color: Color) => {
    if (solved || phase !== 'idle' || poured.length >= 2) return; // ignore tout tap pendant une animation
    playPour();
    dropKeyRef.current += 1;
    setDrop({ key: dropKeyRef.current, color });
    schedule(() => setDrop((current) => (current?.key === dropKeyRef.current ? null : current)), 500);

    const next = [...poured, color];
    setPoured(next);
    if (next.length < 2) return;

    setPhase('mixing');
    playBubble();
    schedule(() => {
      const result = mixColors(next[0] as Color, next[1] as Color);
      setRevealColor(result);
      if (result === round.answer) {
        setPhase('revealed-correct');
        onChoose(result); // seulement maintenant (§5 du contrat) : l'objet a déjà jailli
      } else {
        setPhase('revealed-wrong');
        onChoose(result);
        schedule(() => {
          setPhase('draining');
          playDrain();
          schedule(() => {
            setPoured([]);
            setRevealColor(null);
            setPhase('idle');
          }, DRAIN_MS);
        }, WRONG_REVEAL_MS);
      }
    }, MIX_MS);
  };

  const revealed = phase === 'revealed-correct' || phase === 'revealed-wrong';
  const liquidHeight = phase === 'draining' ? 0 : poured.length === 0 ? 0 : poured.length === 1 ? 46 : 100;
  const liquidBackground = revealed && revealColor
    ? COLOR_HEX[revealColor]
    : poured.length === 1
      ? COLOR_HEX[poured[0] as Color]
      : poured.length === 2
        ? `linear-gradient(135deg, ${COLOR_HEX[poured[0] as Color]}, ${COLOR_HEX[poured[1] as Color]})`
        : undefined;

  const [flasksLeft, flasksRight] = [PRIMARY_FLASKS.slice(0, 2), PRIMARY_FLASKS.slice(2)];
  const recipe = recipeFor(round.answer as Color);

  return (
    <div class="cmx-view" data-mix-recipe={recipe.join(',')}>
      <div class="cmx-target">
        {revealed ? (
          <span class="cmx-target__object cmx-target__object--pop" aria-hidden="true">
            {revealColor ? OBJECT_FOR_COLOR[revealColor] : ''}
          </span>
        ) : (
          <span
            class="cmx-target__splash cmx-target__splash--pulse"
            style={{ background: COLOR_HEX[target] }}
            aria-hidden="true"
          />
        )}
      </div>

      <div class="cmx-lab">
        <div class="cmx-flasks cmx-flasks--left">
          {flasksLeft.map((color) => (
            <Flask key={color} color={color} poured={poured.includes(color)} disabled={phase !== 'idle' || poured.length >= 2} onTap={handleFlaskTap} />
          ))}
        </div>

        <div class="cmx-cauldron">
          {drop && (
            <span
              key={drop.key}
              class="cmx-drop"
              style={{ background: COLOR_HEX[drop.color] }}
              aria-hidden="true"
            />
          )}
          <div
            class={`cmx-cauldron__liquid${phase === 'draining' ? ' cmx-cauldron__liquid--draining' : ''}`}
            style={{ height: `${liquidHeight}%`, background: liquidBackground }}
          />
          {phase === 'mixing' && (
            <div class="cmx-bubbles" aria-hidden="true">
              <span>🫧</span>
              <span>🫧</span>
              <span>🫧</span>
            </div>
          )}
          <div class="cmx-cauldron__rim" aria-hidden="true" />
        </div>

        <div class="cmx-flasks cmx-flasks--right">
          {flasksRight.map((color) => (
            <Flask key={color} color={color} poured={poured.includes(color)} disabled={phase !== 'idle' || poured.length >= 2} onTap={handleFlaskTap} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Flask({
  color,
  poured,
  disabled,
  onTap,
}: {
  color: Color;
  poured: boolean;
  disabled: boolean;
  onTap: (color: Color) => void;
}) {
  return (
    <button
      type="button"
      class={`cmx-flask${poured ? ' cmx-flask--poured' : ''}`}
      data-choice={color}
      disabled={disabled}
      onClick={() => onTap(color)}
    >
      <span class="cmx-flask__glass" style={{ background: COLOR_HEX[color] }} aria-hidden="true" />
    </button>
  );
}
