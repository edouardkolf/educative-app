// Vue du morpion : une manche = gagner une grille contre le téléphone. Aucun texte (jouable dès la maternelle).
// Grille perdue : la ligne du téléphone reste visible ~1 s, MISS, nouvelle grille. Égalité : nouvelle grille.
import { useEffect, useRef, useState } from 'preact/hooks';
import { createRng } from '../../engine/rng';
import { MISS, type MechanicViewProps } from '../../engine/types';
import { boardFromMoves, isLegalMove, winningLine } from '../../games/tictactoe/logic';
import { MarkGlyph, PhoneGlyph } from '../../games/tictactoe/TicTacToeScreen';
import '../../games/tictactoe/tictactoe.css';
import { childStartsGrid, gridResult, hintCells, isChildTurn, phoneMove, type GridResult } from './session';
import type { TicTacToeRoundData } from './types';
import './tictactoe.css';

const PHONE_DELAY_MS = 650;
const LOSS_SHOWN_MS = 1000;
const DRAW_SHOWN_MS = 900;
const WIN_SHOWN_MS = 400;

export function TicTacToeView({ round, solved, onChoose }: MechanicViewProps<TicTacToeRoundData>) {
  const { level, hint, childStarts, seed } = round.data;
  // Alternance : la manche n° k commence comme la grille n° k (l'enfant commence une manche sur deux).
  const firstGrid = round.data.roundIndex ?? 0;
  const [gridIndex, setGridIndex] = useState(0);
  const [moves, setMoves] = useState<number[]>([]);
  const [thinking, setThinking] = useState(false);
  const [rng] = useState(() => createRng(seed));

  const movesRef = useRef<number[]>([]);
  const gridIndexRef = useRef(0);
  const timers = useRef(new Set<number>());
  const unmounted = useRef(false);
  const latest = useRef({ onChoose, solved, round });
  latest.current = { onChoose, solved, round };

  const xStarts = childStartsGrid(childStarts, firstGrid + gridIndex);
  const board = boardFromMoves(moves, xStarts);
  const result = gridResult(moves, xStarts);
  const line = winningLine(board);
  const danger = new Set(thinking || solved ? [] : hintCells(moves, xStarts, hint));

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      if (!unmounted.current) fn();
    }, ms);
    timers.current.add(id);
  }

  useEffect(() => {
    unmounted.current = false;
    // Si le téléphone ouvre la première grille (jamais avec les niveaux actuels, mais permis par le contrat).
    if (!childStartsGrid(childStarts, firstGrid + 0)) schedulePhone(false);
    const pending = timers.current;
    return () => {
      unmounted.current = true;
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startGrid(index: number) {
    const starts = childStartsGrid(childStarts, firstGrid + index);
    gridIndexRef.current = index;
    movesRef.current = [];
    setGridIndex(index);
    setMoves([]);
    setThinking(false);
    if (!starts) schedulePhone(starts);
  }

  function schedulePhone(starts: boolean) {
    setThinking(true);
    later(() => {
      setThinking(false);
      if (gridResult(movesRef.current, starts) !== null) return;
      place(phoneMove(movesRef.current, starts, rng, level), starts);
    }, PHONE_DELAY_MS);
  }

  function place(cell: number, starts: boolean) {
    if (!isLegalMove(boardFromMoves(movesRef.current, starts), cell)) return;
    const next = [...movesRef.current, cell];
    movesRef.current = next;
    setMoves(next);
    const end = gridResult(next, starts);
    if (end) return finishGrid(end);
    if (!isChildTurn(next, starts)) schedulePhone(starts);
  }

  function finishGrid(end: GridResult) {
    const index = gridIndexRef.current;
    if (end === 'win') {
      later(() => latest.current.onChoose(latest.current.round.answer), WIN_SHOWN_MS);
    } else if (end === 'loss') {
      later(() => {
        latest.current.onChoose(MISS);
        startGrid(index + 1);
      }, LOSS_SHOWN_MS);
    } else {
      later(() => startGrid(index + 1), DRAW_SHOWN_MS);
    }
  }

  function onCell(cell: number) {
    if (solved || thinking) return;
    if (!isChildTurn(movesRef.current, childStartsGrid(childStarts, firstGrid + gridIndexRef.current))) return;
    place(cell, childStartsGrid(childStarts, firstGrid + gridIndexRef.current));
  }

  const childActive = result === null && isChildTurn(moves, xStarts);
  const lost = result === 'loss';

  return (
    <div class="tm-view" data-result={result ?? undefined} data-grid={gridIndex}>
      <div class="tm-players">
        <span class={`ttt-player${childActive ? ' ttt-player--active' : ''}`}>
          <MarkGlyph mark="x" size={34} />
        </span>
        <span
          class={`ttt-player${result === null && !childActive ? ' ttt-player--active' : ''}${thinking ? ' ttt-player--thinking' : ''}`}
        >
          <PhoneGlyph size={34} level={level} />
          <MarkGlyph mark="o" size={34} />
        </span>
      </div>
      <div class={`ttt-board${result ? ' ttt-board--over' : ''}${lost ? ' tm-board--lost' : ''}`}>
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            class={`ttt-cell${line?.line.includes(i) ? ' ttt-cell--win' : ''}${danger.has(i) ? ' ttt-cell--danger' : ''}`}
            data-choice={`cell-${i}`}
            data-mark={cell ?? undefined}
            aria-label={`Case ${i + 1}`}
            disabled={cell !== null || result !== null || solved}
            onClick={() => onCell(i)}
          >
            {cell && <MarkGlyph mark={cell} size={72} />}
          </button>
        ))}
      </div>
    </div>
  );
}
