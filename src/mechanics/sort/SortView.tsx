// Vue « sort » (le trieur magique). Aucun texte : paniers à émoji, objet géant, glisser-déposer OU
// tap sur le panier (les deux marchent, §9 « tap uniquement » assoupli pour cette mécanique — voir
// docs/ARCHITECTURE.md). Hitbox très tolérante (voir ./hitbox.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MechanicViewProps } from '../../engine/types';
import { getObject } from '../../ui/objects';
import { playBoing, playDing } from '../../ui/sound';
import { resolveBasket, type BasketRect, type Rect } from './hitbox';
import type { SortRoundData } from './types';
import './sort.css';

function toRect(domRect: DOMRect): Rect {
  return { x: domRect.x, y: domRect.y, width: domRect.width, height: domRect.height };
}

type Phase = 'idle' | 'success' | 'fail';

/** Objet révélé qui rétrécit et saute dans le panier (avant que le moteur n'enchaîne, solvedDelayMs=800). */
const SUCCESS_MS = 480;
/** Rebond élastique avant de pouvoir réessayer (jamais punitif). */
const FAIL_MS = 420;

export function SortView({ round, solved, onChoose }: MechanicViewProps<SortRoundData>) {
  const { objectId, baskets } = round.data;
  const emoji = getObject(objectId)?.emoji ?? '❓';

  const [phase, setPhase] = useState<Phase>('idle');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [animateOffset, setAnimateOffset] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const basketRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragStartRef = useRef({ x: 0, y: 0 });
  const busyRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const registerBasket = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) basketRefs.current.set(id, el);
    else basketRefs.current.delete(id);
  };

  const attempt = (groupId: string) => {
    if (solved || busyRef.current) return;
    busyRef.current = true;
    const isCorrect = groupId === round.answer;

    if (isCorrect) {
      const wrap = wrapRef.current;
      const basketEl = basketRefs.current.get(groupId);
      if (wrap && basketEl) {
        const objectRect = wrap.getBoundingClientRect();
        const basketRect = basketEl.getBoundingClientRect();
        setAnimateOffset(true);
        setOffset({
          x: basketRect.left + basketRect.width / 2 - (objectRect.left + objectRect.width / 2),
          y: basketRect.top + basketRect.height / 2 - (objectRect.top + objectRect.height / 2),
        });
      }
      setPhase('success');
      playDing();
      onChoose(groupId); // le moteur passe `solved` à vrai ; la manche suivante remonte la vue (key)
    } else {
      setAnimateOffset(true);
      setOffset({ x: 0, y: 0 }); // rebond élastique : retour au centre, jamais dans le panier
      setPhase('fail');
      playBoing();
      onChoose(groupId); // enregistré comme manche ratée, sans griser le panier (jamais punitif, §9)
      timerRef.current = window.setTimeout(() => {
        setPhase('idle');
        busyRef.current = false;
      }, FAIL_MS);
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (solved || busyRef.current || phase !== 'idle') return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    setAnimateOffset(false);
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: event.clientX - dragStartRef.current.x, y: event.clientY - dragStartRef.current.y });
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const wrap = wrapRef.current;
    if (!wrap) return;
    const objectRect = toRect(wrap.getBoundingClientRect());
    const basketRects: BasketRect[] = baskets
      .map((b) => {
        const el = basketRefs.current.get(b.id);
        return el ? { id: b.id, rect: toRect(el.getBoundingClientRect()) } : null;
      })
      .filter((b): b is BasketRect => b !== null);
    const chosen = resolveBasket(objectRect, basketRects);
    if (chosen) {
      attempt(chosen);
    } else {
      // Relâché hors de tout panier : glisse au centre, aucun choix envoyé (pas de manche ratée).
      setAnimateOffset(true);
      setOffset({ x: 0, y: 0 });
    }
    event.preventDefault();
  };

  const handleBasketTap = (groupId: string) => {
    if (dragging) return; // évite un double envoi si un clic de souris suit un pointerup de drag
    attempt(groupId);
  };

  const wrapClasses = [
    'srt-object-wrap',
    dragging ? 'srt-object-wrap--dragging' : '',
    animateOffset ? 'srt-object-wrap--animated' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const emojiClasses = [
    'srt-object',
    phase === 'success' ? 'srt-object--success' : '',
    phase === 'fail' ? 'srt-object--fail' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div class="srt-view">
      <div class="srt-baskets">
        {baskets.map((basket) => (
          <button
            key={basket.id}
            type="button"
            ref={registerBasket(basket.id)}
            class="srt-basket"
            data-choice={basket.id}
            onClick={() => handleBasketTap(basket.id)}
          >
            <span class="srt-basket__symbol" aria-hidden="true">
              {basket.symbol}
            </span>
          </button>
        ))}
      </div>
      <div class="srt-stage">
        <div
          ref={wrapRef}
          class={wrapClasses}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span class={emojiClasses} aria-hidden="true">
            {emoji}
          </span>
        </div>
      </div>
    </div>
  );
}
