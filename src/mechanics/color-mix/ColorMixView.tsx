// Vue « color-mix » : le laboratoire des couleurs. Aucun texte : fioles, chaudron, gouttes, bulles.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Color, MechanicViewProps } from '../../engine/types';
import { Emoji } from '../../ui/Emoji';
import { COLOR_HEX } from '../../ui/palette';
import { playBubble, playDrain, playPour } from '../../ui/sound';
import { mixColors, PRIMARY_FLASKS, recipeFor } from './generate';
import { DROP_D, Erlenmeyer, Flask, OBJECT_FOR_COLOR, TargetDrop, type LiquidFill, type LiquidLevel } from './parts';
import type { ColorMixRoundData } from './types';
import './color-mix.css';

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
  // Hauteur du liquide dans l'Erlenmeyer : vide, à moitié après une fiole, plein après deux.
  const level: LiquidLevel = phase === 'draining' || poured.length === 0 ? 'empty' : poured.length === 1 ? 'half' : 'full';
  const liquidFill: LiquidFill =
    revealed && revealColor
      ? { kind: 'solid', color: COLOR_HEX[revealColor] }
      : poured.length === 1
        ? { kind: 'solid', color: COLOR_HEX[poured[0] as Color] }
        : poured.length === 2
          ? { kind: 'swirl', from: COLOR_HEX[poured[0] as Color], to: COLOR_HEX[poured[1] as Color] }
          : { kind: 'solid', color: 'transparent' };

  const [flasksLeft, flasksRight] = [PRIMARY_FLASKS.slice(0, 2), PRIMARY_FLASKS.slice(2)];
  const recipe = recipeFor(round.answer as Color);
  const flasksDisabled = phase !== 'idle' || poured.length >= 2;

  return (
    <div class="cmx-view" data-mix-recipe={recipe.join(',')}>
      <div class="cmx-target">
        {revealed ? (
          <span class="cmx-target__object cmx-target__object--pop" aria-hidden="true">
            {revealColor && <Emoji char={OBJECT_FOR_COLOR[revealColor]} />}
          </span>
        ) : (
          <span class="cmx-target__bubble" aria-hidden="true">
            <TargetDrop color={COLOR_HEX[target]} />
          </span>
        )}
      </div>

      <div class="cmx-lab">
        <div class="cmx-flasks cmx-flasks--left">
          {flasksLeft.map((color) => (
            <Flask key={color} color={color} poured={poured.includes(color)} disabled={flasksDisabled} onTap={handleFlaskTap} />
          ))}
        </div>

        <div class="cmx-cauldron">
          {drop && (
            <svg key={drop.key} class="cmx-drop" viewBox="0 0 48 56" aria-hidden="true">
              <path d={DROP_D} fill={COLOR_HEX[drop.color]} />
              <ellipse cx="17" cy="33" rx="3.5" ry="6" fill="#ffffff" opacity="0.55" />
            </svg>
          )}
          <Erlenmeyer level={level} fill={liquidFill} mixing={phase === 'mixing'} splashKey={drop?.key ?? null} />
        </div>

        <div class="cmx-flasks cmx-flasks--right">
          {flasksRight.map((color) => (
            <Flask key={color} color={color} poured={poured.includes(color)} disabled={flasksDisabled} onTap={handleFlaskTap} />
          ))}
        </div>
      </div>
    </div>
  );
}
