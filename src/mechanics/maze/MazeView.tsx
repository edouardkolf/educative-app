// Vue de la mécanique « maze ». Aucun texte : labyrinthe SVG, animal, nourriture.
// Mode « tap » : on tape la case voisine. Mode « trace » : on glisse le doigt depuis l'animal.
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MechanicViewProps } from '../../engine/types';
import { MISS } from '../../engine/types';
import { emojiUrl } from '../../ui/emoji';
import { addStrike, isNeighbor, sameCell, stepTrail } from './logic';
import type { Cell, Maze, MazeRoundData } from './types';
import './maze.css';

const CELL = 100;
const HALF = CELL / 2;
const ARRIVE_MS = 350;
/** En mode trace, un point du doigt compte pour une case seulement au cœur de celle-ci (tolère les bords et les coins). */
const INNER_MIN = 0.15;
const INNER_MAX = 0.85;

const center = (p: Cell) => ({ x: p.c * CELL + HALF, y: p.r * CELL + HALF });

/** Allées : un segment centre à centre par passage ouvert (traits épais à bouts ronds = coins doux). */
function corridorPath(maze: Maze): string {
  const parts: string[] = [];
  for (let r = 0; r < maze.size; r += 1) {
    for (let c = 0; c < maze.size; c += 1) {
      const i = r * maze.size + c;
      const { x, y } = center({ r, c });
      parts.push(`M${x} ${y}h0`);
      if (maze.right[i]) parts.push(`M${x} ${y}h${CELL}`);
      if (maze.down[i]) parts.push(`M${x} ${y}v${CELL}`);
    }
  }
  return parts.join('');
}

const trailPath = (trail: readonly Cell[]) =>
  trail.map((p, i) => `${i === 0 ? 'M' : 'L'}${center(p).x} ${center(p).y}`).join('') + (trail.length === 1 ? 'h0' : '');

function MazeBoard({ round, solved, onChoose }: MechanicViewProps<MazeRoundData>) {
  const d = round.data;
  const { maze } = d;
  const isTrace = d.mode === 'trace';

  const [trail, setTrail] = useState<Cell[]>([d.start]);
  const trailRef = useRef<Cell[]>([d.start]);
  const [shakeKey, setShakeKey] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const strikes = useRef(0);
  const dragging = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  const celebrating = done || solved;
  const head = trail[trail.length - 1] as Cell;

  const commit = (next: Cell[]) => {
    trailRef.current = next;
    setTrail(next);
    if (sameCell(next[next.length - 1] as Cell, d.goal)) {
      doneRef.current = true;
      dragging.current = false;
      setDone(true);
      timers.current.push(window.setTimeout(() => onChoose(round.answer), ARRIVE_MS));
    }
  };

  /** Choc (tap) ou coupure (trace) : secousse, et MISS une seule fois au 3e. */
  const strike = () => {
    setShakeKey((k) => k + 1);
    const s = addStrike(strikes.current);
    strikes.current = s.count;
    if (s.emit) onChoose(MISS);
  };

  const tapCell = (target: Cell) => {
    if (celebrating || doneRef.current) return;
    const res = stepTrail(maze, trailRef.current, target);
    if (res.kind === 'blocked') strike();
    else if (res.kind !== 'same') commit(res.trail);
  };

  // ----- Mode trace -----

  const cellAt = (clientX: number, clientY: number, strict: boolean): Cell | null => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return null;
    const fx = ((clientX - box.left) / box.width) * maze.size;
    const fy = ((clientY - box.top) / box.height) * maze.size;
    const c = Math.floor(fx);
    const r = Math.floor(fy);
    if (c < 0 || r < 0 || c >= maze.size || r >= maze.size) return null;
    if (strict && (fx - c < INNER_MIN || fx - c > INNER_MAX || fy - r < INNER_MIN || fy - r > INNER_MAX)) return null;
    return { r, c };
  };

  const traceTo = (target: Cell) => {
    const res = stepTrail(maze, trailRef.current, target);
    if (res.kind === 'blocked') {
      dragging.current = false;
      strike();
    } else if (res.kind !== 'same') {
      commit(res.trail);
    }
  };

  const onPointerDown = (e: JSX.TargetedPointerEvent<SVGSVGElement>) => {
    if (!isTrace || celebrating || doneRef.current) return;
    const cell = cellAt(e.clientX, e.clientY, false);
    if (!cell) return;
    const cur = trailRef.current[trailRef.current.length - 1] as Cell;
    if (sameCell(cell, cur)) {
      dragging.current = true;
    } else if (isNeighbor(cell, cur)) {
      // Repli : un tap sur la case voisine du bout du trait avance d'une case, puis on peut continuer à glisser.
      const res = stepTrail(maze, trailRef.current, cell);
      if (res.kind === 'blocked') {
        strike();
        return;
      }
      commit(res.trail);
      dragging.current = true;
    } else {
      return;
    }
    lastPoint.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: JSX.TargetedPointerEvent<SVGSVGElement>) => {
    if (!dragging.current || doneRef.current) return;
    const from = lastPoint.current ?? { x: e.clientX, y: e.clientY };
    const dist = Math.hypot(e.clientX - from.x, e.clientY - from.y);
    const box = svgRef.current?.getBoundingClientRect();
    const stepPx = box ? (box.width / maze.size) * 0.2 : 8;
    const n = Math.max(1, Math.ceil(dist / stepPx));
    // On rejoue le segment parcouru par petits pas : un doigt rapide ne « saute » pas de case.
    for (let i = 1; i <= n && dragging.current && !doneRef.current; i += 1) {
      const x = from.x + ((e.clientX - from.x) * i) / n;
      const y = from.y + ((e.clientY - from.y) * i) / n;
      const cell = cellAt(x, y, true);
      if (cell) traceTo(cell);
    }
    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerEnd = () => {
    dragging.current = false;
    lastPoint.current = null;
  };

  const side = maze.size * CELL;
  const goalPos = center(d.goal);
  const headPos = center(head);
  const corridors = corridorPath(maze);

  return (
    <div class="maze-view" data-mode={d.mode} data-size={maze.size}>
      <div class="maze-board-wrap">
        <div class="maze-board-box">
          <svg
            ref={svgRef}
            class="maze-board"
            viewBox={`0 0 ${side} ${side}`}
            aria-hidden="true"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <rect width={side} height={side} rx="26" fill="#8fd49c" />
            <path d={corridors} class="maze-corridor-edge" />
            <path d={corridors} class="maze-corridor" />
            <path d={trailPath(trail)} class="maze-trail" />
  
            <g transform={`translate(${goalPos.x} ${goalPos.y})`}>
              <circle class="maze-glow" r="40" fill="#ffe27a" />
              <image
                class={celebrating ? 'maze-food maze-food--eaten' : 'maze-food'}
                href={emojiUrl(d.food)}
                x="-30"
                y="-30"
                width="60"
                height="60"
              />
            </g>
  
            <g class="maze-mover" style={{ transform: `translate(${headPos.x}px, ${headPos.y}px)` }}>
              <g key={shakeKey} class={`${shakeKey > 0 ? 'maze-shake' : ''}${celebrating ? ' maze-joy' : ''}`}>
                <image href={emojiUrl(d.animal)} x="-32" y="-32" width="64" height="64" />
              </g>
            </g>
  
            {Array.from({ length: maze.size * maze.size }, (_, i) => {
              const r = Math.floor(i / maze.size);
              const c = i % maze.size;
              return (
                <rect
                  key={i}
                  class="maze-hit"
                  data-choice={`cell-${r}-${c}`}
                  x={c * CELL}
                  y={r * CELL}
                  width={CELL}
                  height={CELL}
                  fill="transparent"
                  onClick={isTrace ? undefined : () => tapCell({ r, c })}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export function MazeView(props: MechanicViewProps<MazeRoundData>) {
  // Une nouvelle manche remonte tout l'état (et annule les minuteries au démontage).
  return <MazeBoard key={props.round as unknown as string} {...props} />;
}
