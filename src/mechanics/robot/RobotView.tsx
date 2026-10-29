// Vue de la mécanique « robot ». Aucun texte : grille SVG, flèches, bande de programme.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MechanicViewProps } from '../../engine/types';
import { MISS } from '../../engine/types';
import { DELTA, DIRS, move, runProgram, samePos } from './logic';
import type { Dir, Pos, RobotRoundData } from './types';
import './robot.css';

const CELL = 100;
const STEP_MS = 250;
const PROGRAM_STEP_MS = 350;
const BUMP_MS = 400;
const RETURN_MS = 600;

const ARROW_ROTATION: Record<Dir, number> = { up: 0, down: 180, left: -90, right: 90 };
const ARROW_LABEL: Record<Dir, string> = { up: 'Haut', down: 'Bas', left: 'Gauche', right: 'Droite' };

function Arrow({ dir }: { dir: Dir }) {
  return (
    <svg class="robot-arrow" viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="50,12 90,54 66,54 66,88 34,88 34,54 10,54"
        transform={`rotate(${ARROW_ROTATION[dir]} 50 50)`}
      />
    </svg>
  );
}

function RobotSprite({ facing, bumpKey, bumpAxis, party }: { facing: Dir; bumpKey: number; bumpAxis: 'h' | 'v'; party: boolean }) {
  const d = DELTA[facing];
  const px = d.x * 4;
  const py = d.y * 4;
  return (
    <g key={bumpKey} class={`${bumpKey > 0 ? `robot-bump robot-bump--${bumpAxis}` : ''}${party ? ' robot-party' : ''}`}>
      <line x1="50" y1="22" x2="50" y2="10" stroke="#4a5a78" stroke-width="5" stroke-linecap="round" />
      <circle cx="50" cy="9" r="6" fill="#ff7a59" />
      <rect x="22" y="76" width="22" height="12" rx="6" fill="#4a5a78" />
      <rect x="56" y="76" width="22" height="12" rx="6" fill="#4a5a78" />
      <rect x="14" y="48" width="10" height="22" rx="5" fill="#4a5a78" />
      <rect x="76" y="48" width="10" height="22" rx="5" fill="#4a5a78" />
      <rect x="20" y="22" width="60" height="58" rx="18" fill="#5aa9e6" stroke="#3b78b0" stroke-width="3" />
      <rect x="28" y="32" width="44" height="30" rx="12" fill="#fffdf7" />
      <circle cx={39 + px} cy={46 + py} r="6.5" fill="#3d2c1e" />
      <circle cx={61 + px} cy={46 + py} r="6.5" fill="#3d2c1e" />
      <circle cx={41 + px} cy={44 + py} r="2" fill="#fff" />
      <circle cx={63 + px} cy={44 + py} r="2" fill="#fff" />
      <path d={party ? 'M40 69 Q50 79 60 69 Z' : 'M42 69 Q50 74 58 69'} fill={party ? '#ff7a59' : 'none'} stroke="#3d2c1e" stroke-width="3" stroke-linecap="round" />
    </g>
  );
}

function Rock() {
  return (
    <g>
      <path d="M16 78 Q10 54 30 36 Q44 20 66 28 Q90 38 86 66 Q84 82 66 84 L30 84 Q18 84 16 78 Z" fill="#9a9aa8" stroke="#6e6e7c" stroke-width="3" />
      <path d="M34 48 Q44 36 58 40" fill="none" stroke="#c6c6d2" stroke-width="5" stroke-linecap="round" />
    </g>
  );
}

function Treasure({ open }: { open: boolean }) {
  return (
    <g class={open ? 'robot-treasure robot-treasure--open' : 'robot-treasure'}>
      <rect x="16" y="46" width="68" height="38" rx="8" fill="#b9772f" stroke="#7a4a14" stroke-width="3" />
      <path d="M16 50 Q16 22 50 22 Q84 22 84 50 Z" fill="#d38b3a" stroke="#7a4a14" stroke-width="3" />
      <rect x="16" y="44" width="68" height="9" fill="#ffd34d" stroke="#7a4a14" stroke-width="2" />
      <rect x="42" y="42" width="16" height="20" rx="4" fill="#ffd34d" stroke="#7a4a14" stroke-width="2" />
      <circle cx="50" cy="52" r="3" fill="#7a4a14" />
    </g>
  );
}

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { dx: Math.round(Math.cos(a) * 70), dy: Math.round(Math.sin(a) * 70) };
});

interface BoardProps extends MechanicViewProps<RobotRoundData> {}

function RobotBoard({ round, solved, onChoose }: BoardProps) {
  const data = round.data;
  const grid = { size: data.size, rocks: data.rocks };
  const isProgram = data.mode === 'program';

  const [pos, setPos] = useState<Pos>(data.start);
  const [facing, setFacing] = useState<Dir>('down');
  const [program, setProgram] = useState<Dir[]>([]);
  const [running, setRunning] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [bumpKey, setBumpKey] = useState(0);
  const [bumpAxis, setBumpAxis] = useState<'h' | 'v'>('h');
  const [done, setDone] = useState(false);

  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  const celebrating = done || solved;
  const locked = celebrating || running;

  const bump = (dir: Dir) => {
    setFacing(dir);
    setBumpAxis(dir === 'left' || dir === 'right' ? 'h' : 'v');
    setBumpKey((k) => k + 1);
  };

  const win = () => {
    setDone(true);
    setActiveIdx(-1);
    onChoose(round.answer);
  };

  const onArrow = (dir: Dir) => {
    if (locked) return;
    if (isProgram) {
      if (program.length < data.maxArrows) setProgram([...program, dir]);
      return;
    }
    setFacing(dir);
    const next = move(grid, pos, dir);
    if (!next) {
      bump(dir);
      onChoose(MISS);
      return;
    }
    setPos(next);
    if (samePos(next, data.goal)) {
      setDone(true);
      later(win, STEP_MS);
    }
  };

  const removeSlot = (i: number) => {
    if (locked || i >= program.length) return;
    setProgram(program.filter((_, k) => k !== i));
  };

  const run = () => {
    if (locked || program.length === 0) return;
    const result = runProgram(grid, data.start, data.goal, program);
    const steps = result.trace.length - 1;
    setRunning(true);
    setPos(data.start);
    for (let i = 0; i < steps; i += 1) {
      later(() => {
        setActiveIdx(i);
        setFacing(program[i] as Dir);
        setPos(result.trace[i + 1] as Pos);
      }, (i + 1) * PROGRAM_STEP_MS);
    }
    const endAt = (steps + 1) * PROGRAM_STEP_MS;
    if (result.outcome === 'goal') {
      later(() => {
        setRunning(false);
        win();
      }, endAt);
      return;
    }
    // Échec : choc sur la flèche k, ou programme fini ailleurs que sur le trésor.
    const failIdx = result.blockedAt ?? program.length - 1;
    later(() => {
      setActiveIdx(failIdx);
      bump(program[failIdx] as Dir);
      onChoose(MISS);
    }, endAt);
    later(() => {
      setPos(data.start);
      setFacing('down');
      setActiveIdx(-1);
    }, endAt + RETURN_MS);
    later(() => setRunning(false), endAt + RETURN_MS + STEP_MS);
  };

  const side = data.size * CELL;
  const slots = isProgram ? Array.from({ length: data.maxArrows }, (_, i) => program[i]) : [];

  return (
    <div class="robot-view" data-mode={data.mode}>
      <div class="robot-board-wrap">
        <svg class="robot-board" viewBox={`0 0 ${side} ${side}`} role="img" aria-label="Grille du robot">
          <rect width={side} height={side} rx="24" fill="#bfe3a8" />
          {Array.from({ length: data.size * data.size }, (_, i) => {
            const x = i % data.size;
            const y = Math.floor(i / data.size);
            return (
              <rect key={i} x={x * CELL + 3} y={y * CELL + 3} width={CELL - 6} height={CELL - 6} rx="14" fill={(x + y) % 2 ? '#d9f0c6' : '#cdeab6'} />
            );
          })}
          {data.rocks.map((r) => (
            <g key={`${r.x}-${r.y}`} transform={`translate(${r.x * CELL} ${r.y * CELL})`}>
              <Rock />
            </g>
          ))}
          <g transform={`translate(${data.goal.x * CELL} ${data.goal.y * CELL})`}>
            <Treasure open={celebrating} />
            {celebrating &&
              SPARKS.map((s, i) => (
                <circle
                  key={i}
                  class="robot-spark"
                  cx="50"
                  cy="46"
                  r="7"
                  fill={i % 2 ? '#ffd34d' : '#ff7a59'}
                  style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` }}
                />
              ))}
          </g>
          <g class="robot-mover" style={{ transform: `translate(${pos.x * CELL}px, ${pos.y * CELL}px)` }}>
            <RobotSprite facing={facing} bumpKey={bumpKey} bumpAxis={bumpAxis} party={celebrating} />
          </g>
        </svg>
      </div>

      {isProgram && (
        <div class="robot-strip">
          {slots.map((dir, i) => (
            <button
              key={i}
              type="button"
              class={`robot-slot${dir ? ' is-filled' : ''}${i === activeIdx ? ' is-active' : ''}`}
              data-choice={`slot-${i}`}
              aria-label={dir ? `Retirer la flèche ${i + 1}` : `Case vide ${i + 1}`}
              onClick={() => removeSlot(i)}
            >
              {dir && <Arrow dir={dir} />}
            </button>
          ))}
        </div>
      )}

      <div class="robot-pad">
        {DIRS.map((dir) => (
          <button
            key={dir}
            type="button"
            class={`robot-btn robot-btn--${dir}${locked ? ' is-locked' : ''}`}
            data-choice={`arrow-${dir}`}
            aria-label={ARROW_LABEL[dir]}
            onClick={() => onArrow(dir)}
          >
            <Arrow dir={dir} />
          </button>
        ))}
        {isProgram && (
          <button
            type="button"
            class={`robot-btn robot-btn--run${locked || program.length === 0 ? ' is-locked' : ''}`}
            data-choice="run"
            aria-label="Lancer le programme"
            onClick={run}
          >
            <svg class="robot-arrow" viewBox="0 0 100 100" aria-hidden="true">
              <polygon points="28,14 86,50 28,86" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function RobotView(props: MechanicViewProps<RobotRoundData>) {
  // Une nouvelle manche remonte tout l'état (et annule les minuteries au démontage).
  return <RobotBoard key={props.round as unknown as string} {...props} />;
}
