// L'atelier de peinture (docs/specs/COLORIAGE.md §2.3, §3.1) : les trois fioles primaires et le
// récipient (l'Erlenmeyer du labo, en réduit). Vue seulement : le cycle (minuteries de mélange et de
// vidange) est tenu par `ColoringScreen`, comme le geste appris au labo des couleurs.
import type { Color } from '../../engine/types';
import { Flask, Erlenmeyer, type LiquidFill, type LiquidLevel } from '../../mechanics/color-mix/parts';
import { COLOR_HEX } from '../../ui/palette';
import type { CupState } from './cup';
import { paintOf } from './cup';
import './coloring.css';

export interface AtelierProps {
  cup: CupState;
  /** Vidange ou mélange en cours : taps ignorés, sans son (docs/specs/COLORIAGE.md §2.3). */
  busy: boolean;
  mixing: boolean;
  draining: boolean;
  /** Case touchée avec le récipient vide : les trois fioles pulsent deux fois (§2.3). */
  pulseFlasks?: boolean;
  onFlaskTap: (color: Color) => void;
  onCupTap: () => void;
  onCupPointerDown: (event: PointerEvent) => void;
}

export function Atelier({ cup, busy, mixing, draining, pulseFlasks = false, onFlaskTap, onCupTap, onCupPointerDown }: AtelierProps) {
  const paint = paintOf(cup);
  const level: LiquidLevel = draining || cup.drops.length === 0 ? 'empty' : cup.drops.length === 1 ? 'half' : 'full';
  const liquidFill: LiquidFill =
    mixing && cup.drops.length === 2
      ? { kind: 'swirl', from: COLOR_HEX[cup.drops[0] as Color], to: COLOR_HEX[cup.drops[1] as Color] }
      : { kind: 'solid', color: paint ? COLOR_HEX[paint] : 'transparent' };

  return (
    <div
      class={`clr-atelier${pulseFlasks ? ' clr-atelier--pulse' : ''}`}
      data-drops={cup.drops.join(',')}
      data-paint={paint ?? 'none'}
      data-pulse={pulseFlasks ? 'true' : undefined}
    >
      <div class="clr-flasks clr-flasks--left">
        <Flask color="red" poured={cup.drops.includes('red')} disabled={busy} onTap={onFlaskTap} />
        <Flask color="yellow" poured={cup.drops.includes('yellow')} disabled={busy} onTap={onFlaskTap} />
      </div>

      <button
        type="button"
        class={`clr-cup${mixing ? ' clr-cup--mixing' : ''}`}
        data-choice="cup"
        disabled={busy}
        onClick={onCupTap}
        onPointerDown={onCupPointerDown}
      >
        <Erlenmeyer level={level} fill={liquidFill} mixing={mixing} splashKey={null} />
      </button>

      <div class="clr-flasks clr-flasks--right">
        <Flask color="blue" poured={cup.drops.includes('blue')} disabled={busy} onTap={onFlaskTap} />
      </div>
    </div>
  );
}
