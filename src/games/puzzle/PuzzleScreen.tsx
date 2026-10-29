// Écran générique des jeux libres de logique (docs/specs/JEUX-LOGIQUE.md §4) : devine le nombre, code secret,
// robot. Phase `choose` (difficulté à 1, 2 ou 3 étoiles, ★ présélectionné), puis `play` : une manche = une
// partie, jouée par la vue de la mécanique avec le même contrat que le moteur de niveaux (LevelPlayer).
// La partie est créée au premier tap de l'enfant (A9), jamais à l'affichage.
import { useEffect, useRef, useState } from 'preact/hooks';
import { returnTo } from '../../app/routes';
import { useProfile } from '../../app/context';
import { createRng } from '../../engine/rng';
import { MISS, type ChoiceId, type Round } from '../../engine/types';
import { getMechanic } from '../../mechanics';
import {
  abandonPuzzle,
  completePuzzle,
  PUZZLE_PRESETS,
  recordPuzzleMiss,
  startPuzzle,
  type PuzzleGameId,
  type PuzzlePreset,
} from '../../storage/puzzles';
import type { GameEndReason } from '../../storage/types';
import { GameIcon } from '../../ui/icons/GameIcon';
import { Icon } from '../../ui/icons/Icon';
import { IconButton } from '../../ui/IconButton';
import { playError, playSuccess, playTap } from '../../ui/sound';
import { useActiveClock } from '../useActiveClock';
import { useSoftEnd } from '../useSoftEnd';
import { PUZZLE_PRESET_PARAMS } from './presets';
import './puzzle.css';

export interface PuzzleScreenProps {
  game: PuzzleGameId;
}

const DEFAULT_SOLVED_DELAY_MS = 900;
/** Pastilles affichées au plus (le compteur exact reste dans `data-count`). */
const MAX_DOTS = 8;

interface RecordSlot {
  id: string | null;
  /** Premier tap reçu : la création de la partie est en file. */
  started: boolean;
  /** Résolue ou close : plus rien à écrire. */
  closed: boolean;
}

const STAR_COUNT: Record<PuzzlePreset, number> = { easy: 1, medium: 2, hard: 3 };

export function PuzzleScreen({ game }: PuzzleScreenProps) {
  const { profile } = useProfile();
  const mechanic = getMechanic(game);
  const [phase, setPhase] = useState<'choose' | 'play'>('choose');
  const [preset, setPreset] = useState<PuzzlePreset>('easy');
  const [round, setRound] = useState<Round<unknown> | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<ReadonlySet<ChoiceId>>(new Set());
  const [solved, setSolved] = useState(false);
  const [started, setStarted] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);

  const presetRef = useRef<PuzzlePreset>('easy');
  const roundRef = useRef<Round<unknown> | null>(null);
  const solvedRef = useRef(false);
  const slotRef = useRef<RecordSlot>({ id: null, started: false, closed: true });
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const timersRef = useRef(new Set<number>());
  const unmountedRef = useRef(false);
  const clock = useActiveClock();

  // Une manche commencée et pas encore remplacée (animation de réussite comprise) est une unité en cours.
  const softEnd = useSoftEnd({
    busy: started,
    onTimeUp: async () => {
      await closeRecord('time-up');
    },
  });

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
      console.error('puzzle write failed', err);
    });
    return writeQueueRef.current;
  }

  /** Abandon ou interruption de la manche en cours ; sans effet si rien n'a été tapé ou si elle est résolue. */
  function closeRecord(reason: GameEndReason): Promise<void> {
    const slot = slotRef.current;
    const activeMs = clock.elapsed();
    return enqueue(async () => {
      if (slot.closed) return;
      slot.closed = true;
      if (slot.id) await abandonPuzzle(slot.id, reason, activeMs);
    });
  }

  /** Premier tap de la manche : crée la partie (arbitrage A9). */
  function ensureStarted() {
    const slot = slotRef.current;
    if (slot.started || slot.closed || !profile) return;
    slot.started = true;
    setStarted(true);
    enqueue(async () => {
      const created = await startPuzzle(profile.id, { game, preset: presetRef.current });
      slot.id = created.id;
    });
  }

  /** Début d'une unité : point de contrôle de la fin douce, puis nouvelle manche (graine nouvelle). */
  function startRound() {
    if (softEnd.checkpoint() || !mechanic) return;
    const params = PUZZLE_PRESET_PARAMS[game][presetRef.current];
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    const [next] = mechanic.generateRounds(params as never, 1, createRng(seed));
    if (!next) return;
    slotRef.current = { id: null, started: false, closed: false };
    roundRef.current = next;
    solvedRef.current = false;
    clock.reset();
    setRound(next);
    setRoundKey((k) => k + 1);
    setWrongChoices(new Set());
    setSolved(false);
    setStarted(false);
    setPhase('play');
  }

  function backToChoose() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current.clear();
    void closeRecord(softEnd.exitReason());
    roundRef.current = null;
    setRound(null);
    setSolved(false);
    setStarted(false);
    setPhase('choose');
  }

  function onChoose(choice: ChoiceId) {
    const current = roundRef.current;
    if (!current || solvedRef.current) return;
    ensureStarted();
    const slot = slotRef.current;
    const activeMs = clock.elapsed();
    if (choice === current.answer) {
      solvedRef.current = true;
      setSolved(true);
      setSolvedCount((n) => n + 1);
      playSuccess();
      enqueue(async () => {
        if (slot.closed) return;
        slot.closed = true;
        if (slot.id) await completePuzzle(slot.id, activeMs);
      });
      const delay = mechanic?.solvedDelayMs;
      later(startRound, (typeof delay === 'function' ? delay(current) : delay) ?? DEFAULT_SOLVED_DELAY_MS);
      return;
    }
    // MISS (budget de coups épuisé) ou tout autre choix : erreur douce, la manche continue.
    playError();
    if (choice !== MISS) setWrongChoices((prev) => new Set(prev).add(choice));
    enqueue(async () => {
      if (slot.closed || !slot.id) return;
      await recordPuzzleMiss(slot.id, activeMs);
    });
  }

  const goHome = () => returnTo('hub');

  if (!profile || !mechanic) return null;

  const homeButton = (
    <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
      <Icon name="home" size={36} />
    </IconButton>
  );

  if (phase === 'choose') {
    return (
      <div class="screen screen--puzzle" data-testid="puzzle" data-game={game} data-phase="choose" data-preset={preset}>
        <div class="puzzle-topbar">{homeButton}</div>
        <div class="puzzle-choose">
          <button
            type="button"
            class={`puzzle-play puzzle-play--${game}`}
            data-testid="puzzle-play"
            aria-label="Jouer"
            onClick={() => {
              playTap();
              startRound();
            }}
          >
            <GameIcon id={game} size={150} />
          </button>
          <div class="puzzle-presets" role="group" aria-label="Difficulté">
            {PUZZLE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                class={`puzzle-preset${preset === p ? ' puzzle-preset--on' : ''}`}
                aria-pressed={preset === p}
                aria-label={`${STAR_COUNT[p]} étoile${STAR_COUNT[p] > 1 ? 's' : ''}`}
                data-testid={`puzzle-preset-${p}`}
                onClick={() => {
                  playTap();
                  presetRef.current = p;
                  setPreset(p);
                }}
              >
                <Stars count={STAR_COUNT[p]} size={26} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="screen screen--puzzle" data-testid="puzzle" data-game={game} data-phase="play" data-preset={preset}>
      <div class="puzzle-topbar">
        {homeButton}
        <div class="puzzle-dots" data-testid="puzzle-solved" data-count={solvedCount}>
          {Array.from({ length: Math.min(solvedCount, MAX_DOTS) }, (_, i) => (
            <span key={i} class="puzzle-dot" />
          ))}
        </div>
        <button
          type="button"
          class="puzzle-level"
          aria-label="Changer de difficulté"
          data-testid="puzzle-level"
          onClick={() => {
            playTap();
            backToChoose();
          }}
        >
          <Stars count={STAR_COUNT[preset]} size={20} />
        </button>
      </div>
      <div class="puzzle-stage" onPointerDownCapture={ensureStarted}>
        {round && (
          <div class="play-round" data-answer={round.answer}>
            <mechanic.View
              key={roundKey}
              round={round}
              wrongChoices={wrongChoices}
              solved={solved}
              onChoose={onChoose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Stars({ count, size }: { count: number; size: number }) {
  return (
    <span class="puzzle-stars" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Icon key={i} name="star" size={size} />
      ))}
    </span>
  );
}
