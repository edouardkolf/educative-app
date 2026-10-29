// Vue de la mécanique « memory ». Aucun texte : dos de carte à motif, faces = émojis des objets.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MechanicViewProps } from '../../engine/types';
import { MISS } from '../../engine/types';
import { Emoji } from '../../ui/Emoji';
import { getObject } from '../../ui/objects';
import { createTable, flip, gridFor, hideMismatch, isCleared, isFaceUp, takeMissSignal } from './logic';
import type { MemoryTable } from './logic';
import type { MemoryRoundData } from './types';
import './memory.css';

const HIDE_MISMATCH_MS = 900;
const PARTY_MS = 600;

function CardBack() {
  return (
    <svg class="memory-back-star" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 5l5.2 12.2 13.2 1.2-10 8.7 3 12.9L24 33l-11.4 7 3-12.9-10-8.7 13.2-1.2z"
        fill="#fff6c9"
        stroke="#fff6c9"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path d="M19 15.5l3-3" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />
    </svg>
  );
}

function MemoryBoard({ round, solved, onChoose }: MechanicViewProps<MemoryRoundData>) {
  const { cards, maxMisses, peekMs } = round.data;
  const tableRef = useRef<MemoryTable>(createTable(cards, maxMisses));
  const timers = useRef<number[]>([]);
  const [, setTick] = useState(0);
  const [peeking, setPeeking] = useState(peekMs > 0);
  const [party, setParty] = useState(false);
  const [justFound, setJustFound] = useState<number[]>([]);
  const redraw = () => setTick((n) => n + 1);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    if (peekMs > 0) later(() => setPeeking(false), peekMs);
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  const table = tableRef.current;
  const locked = solved || peeking || party || table.flipped.length >= 2;

  const onTap = (index: number) => {
    if (locked) return;
    const outcome = flip(table, index);
    if (outcome === 'ignored') return;
    if (outcome === 'match') {
      const pair = table.cards.map((c, i) => (table.found[i] && c === table.cards[index] ? i : -1)).filter((i) => i >= 0);
      setJustFound(pair);
      if (isCleared(table)) {
        setParty(true);
        later(() => onChoose(round.answer), PARTY_MS);
      }
    } else if (outcome === 'mismatch') {
      later(() => {
        hideMismatch(table);
        redraw();
      }, HIDE_MISMATCH_MS);
      if (takeMissSignal(table)) onChoose(MISS);
    }
    redraw();
  };

  const { cols, rows } = gridFor(cards.length);
  return (
    <div class={`memory-view${party || solved ? ' memory-view--party' : ''}`}>
      <div class="memory-area">
        <div class="memory-grid" style={{ '--cols': cols, '--rows': rows }}>
          {cards.map((id, i) => {
            const faceUp = peeking || isFaceUp(table, i);
            const found = table.found[i] === true;
            const cls = `memory-card${faceUp ? ' memory-card--up' : ''}${found ? ' memory-card--found' : ''}${
              justFound.includes(i) ? ' memory-card--just' : ''
            }`;
            return (
              <button
                key={i}
                type="button"
                class={cls}
                data-choice={`card-${i}`}
                aria-label="Carte"
                onClick={() => onTap(i)}
              >
                <span class="memory-card-inner">
                  <span class="memory-face memory-face--back">
                    <CardBack />
                  </span>
                  <span class="memory-face memory-face--front">
                    {/* Objets validés au build : un id inconnu n'affiche rien (pas d'émoji non embarqué). */}
                    {getObject(id) && <Emoji char={getObject(id)!.emoji} />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Une nouvelle manche (nouvel objet `round`) repart d'une table neuve. */
export function MemoryView(props: MechanicViewProps<MemoryRoundData>) {
  const last = useRef(props.round);
  const gen = useRef(0);
  if (last.current !== props.round) {
    last.current = props.round;
    gen.current += 1;
  }
  return <MemoryBoard key={gen.current} {...props} />;
}
