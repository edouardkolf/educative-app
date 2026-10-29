// Écran du morpion (docs/specs/MORPION-PENDU.md §2.1). Phases `choose` (contre le téléphone, au niveau
// choisi — facile par défaut à chaque ouverture —, ou à deux),
// puis `play` (une grille = une partie). Le premier joueur alterne d'une grille à l'autre ; en solo,
// l'enfant joue les croix et commence la première grille. La logique est pure (`logic.ts`) : cet écran
// exécute les effets (sons, délais, stockage) et la fin douce.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useProfile } from '../../app/context';
import { returnTo } from '../../app/routes';
import { createRng } from '../../engine/rng';
import { Emoji } from '../../ui/Emoji';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playError, playFanfare, playTap } from '../../ui/sound';
import { useSoftEnd } from '../useSoftEnd';
import {
  abandonTicTacToe,
  completeTicTacToe,
  saveTicTacToeMoves,
  startTicTacToe,
  type TicTacToeMode,
  type TicTacToeOutcome,
} from '../../storage/tictactoes';
import type { GameEndReason } from '../../storage/types';
import {
  boardFromMoves,
  chooseComputerMove,
  isLegalMove,
  LEVELS,
  nextMark,
  outcomeOf,
  threatCells,
  winningLine,
  type Level,
  type Mark,
} from './logic';
import { LEVEL_LABELS } from './TicTacToeStats';
import { useActiveClock } from '../useActiveClock';
import './tictactoe.css';

/** Délai avant le coup du téléphone, pour qu'on le voie « réfléchir ». */
const COMPUTER_DELAY_MS = 650;
/** Temps de l'animation de fin de grille (ligne gagnante, son) avant d'afficher « encore ». */
const END_ANIMATION_MS = 900;

interface RecordSlot {
  id: string | null;
  closed: boolean;
}

interface Score {
  x: number;
  o: number;
  draw: number;
}

export function TicTacToeScreen() {
  const { profile } = useProfile();
  const [mode, setMode] = useState<TicTacToeMode | null>(null);
  const [level, setLevel] = useState<Level>('easy');
  const levelRef = useRef<Level>('easy');
  const [xStarts, setXStarts] = useState(true);
  const [moves, setMoves] = useState<number[]>([]);
  const [thinking, setThinking] = useState(false);
  const [endAnimating, setEndAnimating] = useState(false);
  const [score, setScore] = useState<Score>({ x: 0, o: 0, draw: 0 });

  const movesRef = useRef<number[]>([]);
  const recordRef = useRef<RecordSlot>({ id: null, closed: true });
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const timersRef = useRef(new Set<number>());
  const unmountedRef = useRef(false);
  const rngRef = useRef(createRng(Date.now() >>> 0));
  const clock = useActiveClock();

  const board = boardFromMoves(moves, xStarts);
  const outcome = outcomeOf(board);
  const win = winningLine(board);
  const turnNow = nextMark(moves, xStarts);
  // Coup de pouce (facile) : l'alignement que le téléphone menace clignote quand c'est à l'enfant de jouer.
  const danger =
    mode === 'solo' && level === 'easy' && outcome === null && !thinking && turnNow === 'x'
      ? new Set(threatCells(board, 'o'))
      : new Set<number>();
  const gridInProgress = mode !== null && outcome === null && (moves.length > 0 || thinking);

  const softEnd = useSoftEnd({
    busy: gridInProgress || endAnimating,
    onTimeUp: async () => {
      await closeRecord('time-up');
    },
  });

  // Sortie (maison, retour Android) : minuteries annulées, partie close sauf si la fin douce l'a fait.
  useEffect(() => {
    unmountedRef.current = false;
    const timers = timersRef.current;
    return () => {
      unmountedRef.current = true;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      if (softEnd.endedRef.current) return;
      void closeRecord(softEnd.exitReason());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }

  function enqueue(task: () => Promise<void>): Promise<void> {
    writeQueueRef.current = writeQueueRef.current.then(task, task).catch((err) => {
      console.error('tictactoe write failed', err);
    });
    return writeQueueRef.current;
  }

  /** Clôt la grille ouverte (abandon ou interruption) ; une grille finie est déjà close. */
  function closeRecord(reason: GameEndReason): Promise<void> {
    const slot = recordRef.current;
    const activeMs = clock.elapsed();
    return enqueue(async () => {
      if (slot.closed) return;
      slot.closed = true;
      if (slot.id) await abandonTicTacToe(slot.id, reason, activeMs);
    });
  }

  /** Enregistre un coup : crée la partie au premier coup (A9), la clôt si la grille est finie. */
  function persist(nextMoves: number[], gridMode: TicTacToeMode, gridXStarts: boolean, end: TicTacToeOutcome | null) {
    const slot = recordRef.current;
    const activeMs = clock.elapsed();
    const snapshot = [...nextMoves];
    enqueue(async () => {
      if (slot.closed || !profile) return;
      if (!slot.id) {
        const created = await startTicTacToe(profile.id, {
          mode: gridMode,
          xStarts: gridXStarts,
          moves: snapshot,
          ...(gridMode === 'solo' ? { level: levelRef.current } : {}),
        });
        if (unmountedRef.current && !end) {
          slot.closed = true;
          await abandonTicTacToe(created.id, softEnd.exitReason(), activeMs);
          return;
        }
        slot.id = created.id;
      }
      if (end) {
        slot.closed = true;
        await completeTicTacToe(slot.id, snapshot, end, activeMs);
      } else {
        await saveTicTacToeMoves(slot.id, snapshot, activeMs);
      }
    });
  }

  function onGridEnd(end: TicTacToeOutcome, gridMode: TicTacToeMode) {
    setScore((s) => ({ ...s, [end]: s[end] + 1 }));
    setEndAnimating(true);
    if (end === 'draw') playTap();
    else if (gridMode === 'duo' || end === 'x') playFanfare();
    else playError();
    later(() => setEndAnimating(false), END_ANIMATION_MS);
  }

  function play(cell: number, gridMode: TicTacToeMode, gridXStarts: boolean) {
    const current = boardFromMoves(movesRef.current, gridXStarts);
    if (!isLegalMove(current, cell)) return;
    const nextMoves = [...movesRef.current, cell];
    movesRef.current = nextMoves;
    setMoves(nextMoves);
    const end = outcomeOf(boardFromMoves(nextMoves, gridXStarts));
    persist(nextMoves, gridMode, gridXStarts, end);
    if (end) {
      onGridEnd(end, gridMode);
      return;
    }
    if (gridMode === 'solo' && nextMark(nextMoves, gridXStarts) === 'o') scheduleComputer(gridXStarts);
  }

  function scheduleComputer(gridXStarts: boolean) {
    setThinking(true);
    later(() => {
      if (unmountedRef.current) return;
      setThinking(false);
      const current = boardFromMoves(movesRef.current, gridXStarts);
      if (outcomeOf(current) !== null) return;
      play(chooseComputerMove(current, 'o', rngRef.current, levelRef.current), 'solo', gridXStarts);
    }, COMPUTER_DELAY_MS);
  }

  /** Début d'une unité (une grille) : point de contrôle de la fin douce, puis grille vide. */
  function startGrid(gridMode: TicTacToeMode, gridXStarts: boolean) {
    if (softEnd.checkpoint()) return;
    recordRef.current = { id: null, closed: false };
    movesRef.current = [];
    clock.reset();
    setMoves([]);
    setThinking(false);
    setEndAnimating(false);
    setMode(gridMode);
    setXStarts(gridXStarts);
    if (gridMode === 'solo' && !gridXStarts) scheduleComputer(gridXStarts);
  }

  function onCell(cell: number) {
    if (!mode || thinking || outcome !== null) return;
    if (mode === 'solo' && nextMark(movesRef.current, xStarts) !== 'x') return;
    play(cell, mode, xStarts);
  }

  const goHome = () => returnTo('hub');

  if (!profile) return null;

  if (mode === null) {
    return (
      <div class="screen screen--tictactoe" data-testid="tictactoe" data-phase="choose">
        <div class="ttt-topbar">
          <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
            <Icon name="home" size={36} />
          </IconButton>
        </div>
        <div class="ttt-modes">
          <div class="ttt-solo">
            <button type="button" class="ttt-mode" data-testid="ttt-mode-solo" onClick={() => startGrid('solo', true)}>
              <span class="ttt-mode__players">
                <Emoji char={profile.avatar} />
                <PhoneGlyph size={56} level={level} />
              </span>
              <span class="ttt-mode__label">Contre le téléphone</span>
            </button>
            <div class="ttt-levels" role="group" aria-label="Niveau du téléphone">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  class={`ttt-level${level === l ? ' ttt-level--on' : ''}`}
                  aria-pressed={level === l}
                  data-testid={`ttt-level-${l}`}
                  onClick={() => {
                    playTap();
                    levelRef.current = l;
                    setLevel(l);
                  }}
                >
                  <PhoneGlyph size={36} level={l} />
                  <span class="ttt-level__label">{LEVEL_LABELS[l]}</span>
                </button>
              ))}
            </div>
          </div>
          <button type="button" class="ttt-mode" data-testid="ttt-mode-duo" onClick={() => startGrid('duo', true)}>
            <span class="ttt-mode__players">
              <MarkGlyph mark="x" size={52} />
              <MarkGlyph mark="o" size={52} />
            </span>
            <span class="ttt-mode__label">À deux</span>
          </button>
        </div>
      </div>
    );
  }

  const turn = nextMark(moves, xStarts);
  const showAgain = outcome !== null && !endAnimating && !softEnd.timeUp;

  return (
    <div
      class="screen screen--tictactoe"
      data-testid="tictactoe"
      data-phase="play"
      data-mode={mode}
      data-level={mode === 'solo' ? level : undefined}
      data-outcome={outcome ?? undefined}
    >
      <div class="ttt-topbar">
        <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
        <div class="ttt-score" data-testid="ttt-score">
          <PlayerBadge mark="x" mode={mode} avatar={profile.avatar} active={outcome === null && turn === 'x'} />
          <span class="ttt-score__value" data-testid="ttt-score-value">
            {score.x} – {score.o}
          </span>
          <PlayerBadge
            mark="o"
            mode={mode}
            avatar={profile.avatar}
            active={outcome === null && turn === 'o'}
            thinking={thinking}
            level={level}
          />
        </div>
      </div>

      <div class={`ttt-board${outcome ? ' ttt-board--over' : ''}`} role="grid" aria-label="Grille du morpion">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            class={`ttt-cell${win?.line.includes(i) ? ' ttt-cell--win' : ''}${danger.has(i) ? ' ttt-cell--danger' : ''}`}
            data-testid={`ttt-cell-${i}`}
            data-mark={cell ?? undefined}
            aria-label={cell ? (cell === 'x' ? 'Croix' : 'Rond') : `Case ${i + 1}`}
            disabled={cell !== null || outcome !== null}
            onClick={() => onCell(i)}
          >
            {cell && <MarkGlyph mark={cell} size={72} />}
          </button>
        ))}
      </div>

      <div class="ttt-footer">
        {outcome !== null && (
          <p class="ttt-result" data-testid="ttt-result">
            {resultText(outcome, mode)}
          </p>
        )}
        {showAgain && (
          <IconButton size={72} onClick={() => startGrid(mode, !xStarts)} aria-label="Encore une partie" data-testid="ttt-again">
            <Icon name="replay" size={44} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function resultText(outcome: TicTacToeOutcome, mode: TicTacToeMode): string {
  if (outcome === 'draw') return 'Égalité !';
  if (mode === 'duo') return outcome === 'x' ? 'Les croix gagnent !' : 'Les ronds gagnent !';
  return outcome === 'x' ? 'Bravo, tu as gagné !' : 'Le téléphone gagne. Revanche ?';
}

function PlayerBadge({
  mark,
  mode,
  avatar,
  active,
  thinking = false,
  level = 'medium',
}: {
  mark: Mark;
  mode: TicTacToeMode;
  avatar: string;
  active: boolean;
  thinking?: boolean;
  level?: Level;
}) {
  return (
    <span class={`ttt-player${active ? ' ttt-player--active' : ''}${thinking ? ' ttt-player--thinking' : ''}`} data-testid={`ttt-player-${mark}`}>
      {mode === 'solo' && <span class="ttt-player__who">{mark === 'x' ? <Emoji char={avatar} /> : <PhoneGlyph size={30} level={level} />}</span>}
      <MarkGlyph mark={mark} size={30} />
    </span>
  );
}

/** Croix rouge ou rond bleu, dessinés (pas de police) pour un rendu identique partout. */
export function MarkGlyph({ mark, size }: { mark: Mark; size: number }) {
  return (
    <svg class={`ttt-mark ttt-mark--${mark}`} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      {mark === 'x' ? (
        <path d="M12 12L36 36M36 12L12 36" stroke="#e63946" stroke-width="7" stroke-linecap="round" />
      ) : (
        <circle cx="24" cy="24" r="13" fill="none" stroke="#1d7fd8" stroke-width="7" />
      )}
    </svg>
  );
}

/** Le téléphone adversaire, avec une tête par niveau : endormi et souriant, souriant, lunettes noires. */
function PhoneGlyph({ size, level = 'medium' }: { size: number; level?: Level }) {
  const body = level === 'easy' ? '#4fb3a9' : level === 'hard' ? '#3d2c6e' : '#6c63ff';
  return (
    <svg class={`ttt-phone ttt-phone--${level}`} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      <rect x="12" y="4" width="24" height="40" rx="6" fill={body} />
      <rect x="15" y="9" width="18" height="27" rx="2.5" fill="#e9e7ff" />
      {level === 'easy' && (
        <>
          <path d="M18 19.5Q20 17 22 19.5M26 19.5Q28 17 30 19.5" fill="none" stroke="#3d2c1e" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="18.5" cy="23.5" r="1.6" fill="#ffb3c6" />
          <circle cx="29.5" cy="23.5" r="1.6" fill="#ffb3c6" />
          <path d="M20 25.5Q24 29.5 28 25.5" fill="none" stroke="#3d2c1e" stroke-width="2" stroke-linecap="round" />
        </>
      )}
      {level === 'medium' && (
        <>
          <circle cx="20" cy="19" r="2" fill="#3d2c1e" />
          <circle cx="28" cy="19" r="2" fill="#3d2c1e" />
          <path d="M19.5 25Q24 29.5 28.5 25" fill="none" stroke="#3d2c1e" stroke-width="2" stroke-linecap="round" />
        </>
      )}
      {level === 'hard' && (
        <>
          <path d="M16.5 17H31.5" stroke="#3d2c1e" stroke-width="1.6" />
          <rect x="16.8" y="16.5" width="6.4" height="4.6" rx="2" fill="#3d2c1e" />
          <rect x="24.8" y="16.5" width="6.4" height="4.6" rx="2" fill="#3d2c1e" />
          <path d="M20 26.5Q24 28 28.5 25" fill="none" stroke="#3d2c1e" stroke-width="2" stroke-linecap="round" />
        </>
      )}
      <circle cx="24" cy="40" r="1.8" fill="#e9e7ff" />
    </svg>
  );
}
