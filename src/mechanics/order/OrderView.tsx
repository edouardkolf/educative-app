// Vue « ranger du plus petit au plus grand ». Aucun texte : émojis à l'échelle, cartes de points, silhouettes.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MechanicViewProps } from '../../engine/types';
import { MISS } from '../../engine/types';
import { Emoji } from '../../ui/Emoji';
import type { OrderItem, OrderRoundData } from './types';
import './order.css';

const SHAKE_MS = 420;
const CELEBRATE_MS = 650;

/** Positions (viewBox 100) des points : constellations de dé jusqu'à 6, au-delà des rangées régulières. */
function dotLayout(n: number): Array<[number, number]> {
  const col = [25, 50, 75];
  const dice: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[26, 26], [50, 50], [74, 74]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
    6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78], [70, 78]],
  };
  const known = dice[n];
  if (known) return known;
  const rows: Record<number, number[]> = { 7: [4, 3], 8: [4, 4], 9: [3, 3, 3] };
  const layout = rows[n] ?? [n];
  const dots: Array<[number, number]> = [];
  layout.forEach((len, r) => {
    const y = layout.length === 2 ? 32 + r * 36 : col[r] ?? 50;
    for (let c = 0; c < len; c += 1) {
      const x = len === 4 ? 14 + c * 24 : len === 3 && layout.length === 2 ? 26 + c * 24 : col[c] ?? 50;
      dots.push([x, y]);
    }
  });
  return dots;
}

function DotCard({ count }: { count: number }) {
  const r = count <= 6 ? 12 : count === 9 ? 10 : 9;
  return (
    <svg class="order-dots" viewBox="0 0 100 100" aria-hidden="true">
      {dotLayout(count).map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#e63946" />
          <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.28} fill="#ff9aa3" />
        </g>
      ))}
    </svg>
  );
}

function ItemFace({ item, data }: { item: OrderItem; data: OrderRoundData }) {
  if (data.mode === 'quantity') return <DotCard count={item.count ?? 1} />;
  return (
    <span class="order-emoji" style={{ '--scale': (item.scale ?? 100) / 100 }}>
      <Emoji char={data.emoji ?? '⭐'} />
    </span>
  );
}

/** Silhouette de repère (étoile) : petite à gauche, grande à droite. */
function Silhouette({ big }: { big: boolean }) {
  return (
    <svg class={`order-mark order-mark--${big ? 'big' : 'small'}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4 6 20.8l1.4-6.7-5-4.6 6.7-.8z" fill="currentColor" />
    </svg>
  );
}

interface Placed {
  id: string;
  dx: number;
  dy: number;
}

function OrderBoard({ round, solved, onChoose }: MechanicViewProps<OrderRoundData>) {
  const { items, mode } = round.data;
  const sortedIds = round.answer.split('-');
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const missSent = useRef(false);
  const timers = useRef<number[]>([]);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const done = placed.length === items.length;

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const tap = (item: OrderItem, el: HTMLElement) => {
    if (solved || done || placed.some((p) => p.id === item.id)) return;
    if (item.id === sortedIds[placed.length]) {
      const slot = slotRefs.current[placed.length];
      const from = el.getBoundingClientRect();
      const to = slot?.getBoundingClientRect();
      const dx = to ? from.left + from.width / 2 - (to.left + to.width / 2) : 0;
      const dy = to ? from.top + from.height / 2 - (to.top + to.height / 2) : -120;
      setPlaced([...placed, { id: item.id, dx, dy }]);
      if (placed.length + 1 === items.length) later(() => onChoose(round.answer), CELEBRATE_MS);
      return;
    }
    setShaking(item.id);
    later(() => setShaking((s) => (s === item.id ? null : s)), SHAKE_MS);
    if (!missSent.current) {
      missSent.current = true;
      onChoose(MISS);
    }
  };

  return (
    <div class={`order-view${done ? ' order-view--done' : ''}`} data-mode={mode}>
      <div class="order-pool">
        {items.map((item) => {
          const isPlaced = placed.some((p) => p.id === item.id);
          return (
            <button
              key={item.id}
              type="button"
              class={`order-item${isPlaced ? ' order-item--gone' : ''}${shaking === item.id ? ' order-item--shake' : ''}`}
              data-choice={`item-${item.id}`}
              disabled={isPlaced}
              onClick={(e) => tap(item, e.currentTarget)}
            >
              <ItemFace item={item} data={round.data} />
            </button>
          );
        })}
      </div>

      <div class="order-slots">
        {items.map((_, i) => {
          const p = placed[i];
          const item = p ? items.find((it) => it.id === p.id) : undefined;
          return (
            <div
              key={i}
              class={`order-slot${p ? ' order-slot--filled' : ''}`}
              style={{ '--i': i }}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
            >
              {!p && (i === 0 || i === items.length - 1) && <Silhouette big={i !== 0} />}
              {p && item && (
                <div class="order-slot__item" style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px` }}>
                  <ItemFace item={item} data={round.data} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <svg class="order-wedge" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 6 L100 0 L100 12 L0 8 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

export function OrderView(props: MechanicViewProps<OrderRoundData>) {
  // Clé de manche : l'état local repart de zéro quand le moteur change de manche.
  const key = `${props.round.answer}|${props.round.data.emoji ?? ''}|${props.round.data.items.map((i) => i.id).join(',')}`;
  return <OrderBoard key={key} {...props} />;
}
