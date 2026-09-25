// Vue « builder » (le constructeur) : reconstituer une figure en posant les bonnes pièces sur leurs
// emplacements. Silhouette grise en creux au centre, plateau de pièces en bas. Glisser-déposer OU
// tap (sélectionner une pièce puis taper son emplacement) — les deux marchent, comme « sort ».
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MechanicViewProps } from '../../engine/types';
import { COLOR_HEX } from '../../ui/palette';
import { playBoing, playDing } from '../../ui/sound';
import { resolvePlacement, shapesMatch, type SlotTarget } from './snap';
import type { BuilderRoundData } from './types';
import './builder.css';

/** Tolérance de la dépose en glisser-déposer : 15 % de la largeur de la figure. */
const TOLERANCE_RATIO = 0.15;
/** Rebond avant de pouvoir réessayer (jamais punitif, comme sort). */
const FAIL_MS = 420;
/** Cible tactile minimale (§9 ARCHITECTURE.md) : un emplacement peut être visuellement plus petit
 * (la silhouette doit rester fidèle à la figure), sa zone tapable ne l'est jamais. */
const MIN_HIT_PX = 72;

export function BuilderView({ round, solved, onChoose }: MechanicViewProps<BuilderRoundData>) {
  const { slots, pieces, endAnimation } = round.data;

  const [filled, setFilled] = useState<Record<string, string>>({}); // slotId -> pieceId
  const [placedPieceIds, setPlacedPieceIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [animatedOffset, setAnimatedOffset] = useState<Record<string, boolean>>({});
  const [failing, setFailing] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  /** Largeur (px) du carré figure, mesurée : convertit le repère 100×100 des slots en pixels pour
   * séparer taille visuelle fidèle (la silhouette) et zone tapable agrandie (≥ 72 px, §9). */
  const [figurePx, setFigurePx] = useState(320);

  const figureRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pieceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const draggingIdRef = useRef<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const busyRef = useRef(false);
  const doneRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  useEffect(() => {
    const measure = () => {
      const width = figureRef.current?.getBoundingClientRect().width;
      if (width) setFigurePx(width);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const registerSlot = (id: string) => (el: HTMLElement | null) => {
    if (el) slotRefs.current.set(id, el);
    else slotRefs.current.delete(id);
  };
  const registerPiece = (id: string) => (el: HTMLElement | null) => {
    if (el) pieceRefs.current.set(id, el);
    else pieceRefs.current.delete(id);
  };

  const placeMatch = (pieceId: string, slotId: string) => {
    playDing();
    setFilled((prev) => ({ ...prev, [slotId]: pieceId }));
    setPlacedPieceIds((prev) => new Set(prev).add(pieceId));
    setSelected(null);
    const filledCount = Object.keys(filled).length + 1;
    if (filledCount >= slots.length) {
      setEnded(true);
      if (!doneRef.current) {
        doneRef.current = true;
        onChoose('done'); // toutes les manches faites : le moteur passe `solved` à vrai
      }
      // busyRef reste vrai : plus aucune interaction pendant l'animation de fin.
      return;
    }
    busyRef.current = false;
  };

  const placeMismatch = (pieceId: string) => {
    playBoing();
    setSelected(null);
    setFailing(pieceId);
    setAnimatedOffset((prev) => ({ ...prev, [pieceId]: true }));
    setOffsets((prev) => ({ ...prev, [pieceId]: { x: 0, y: 0 } }));
    onChoose('wrong'); // manche ratée au premier coup, jamais punitif (pas de griseage, §9)
    schedule(() => {
      setFailing(null);
      busyRef.current = false;
    }, FAIL_MS);
  };

  const glideBack = (pieceId: string) => {
    setAnimatedOffset((prev) => ({ ...prev, [pieceId]: true }));
    setOffsets((prev) => ({ ...prev, [pieceId]: { x: 0, y: 0 } }));
    busyRef.current = false;
  };

  /** Résolution directe (tap) : pas de tolérance de position, seulement forme/taille. */
  const attemptTap = (pieceId: string, slotId: string) => {
    if (solved || ended || busyRef.current || filled[slotId]) return;
    const piece = pieces.find((p) => p.id === pieceId);
    const slot = slots.find((s) => s.id === slotId);
    if (!piece || !slot) return;
    busyRef.current = true;
    if (shapesMatch(piece, slot)) placeMatch(pieceId, slotId);
    else placeMismatch(pieceId);
  };

  const handlePieceTap = (pieceId: string) => {
    if (solved || ended || busyRef.current || dragging) return;
    if (placedPieceIds.has(pieceId)) return;
    setSelected((prev) => (prev === pieceId ? null : pieceId));
  };

  const handleSlotTap = (slotId: string) => {
    if (!selected) return;
    attemptTap(selected, slotId);
  };

  const handlePointerDown = (pieceId: string) => (event: PointerEvent) => {
    if (solved || ended || busyRef.current || placedPieceIds.has(pieceId)) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelected(null);
    draggingIdRef.current = pieceId;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    setAnimatedOffset((prev) => ({ ...prev, [pieceId]: false }));
    setDragging(pieceId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const pieceId = draggingIdRef.current;
    if (!pieceId) return;
    setOffsets((prev) => ({
      ...prev,
      [pieceId]: { x: event.clientX - dragStartRef.current.x, y: event.clientY - dragStartRef.current.y },
    }));
  };

  const handlePointerUp = () => {
    const pieceId = draggingIdRef.current;
    if (!pieceId) return;
    draggingIdRef.current = null;
    setDragging(null);
    if (solved || ended || busyRef.current) return;

    const pieceEl = pieceRefs.current.get(pieceId);
    const figureEl = figureRef.current;
    const piece = pieces.find((p) => p.id === pieceId);
    if (!pieceEl || !figureEl || !piece) return;

    const pieceRect = pieceEl.getBoundingClientRect();
    const dropCenter = { x: pieceRect.left + pieceRect.width / 2, y: pieceRect.top + pieceRect.height / 2 };
    const tolerance = figureEl.getBoundingClientRect().width * TOLERANCE_RATIO;

    const slotTargets: SlotTarget[] = slots.map((slot) => {
      const el = slotRefs.current.get(slot.id);
      const rect = el?.getBoundingClientRect();
      const center = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
      return { id: slot.id, shape: slot.shape, w: slot.w, h: slot.h, center, filled: Boolean(filled[slot.id]) };
    });

    const result = resolvePlacement(piece, dropCenter, slotTargets, tolerance);
    busyRef.current = true;
    if (result.kind === 'none') glideBack(pieceId);
    else if (result.kind === 'mismatch') placeMismatch(pieceId);
    else placeMatch(pieceId, result.slotId);
  };

  const trayPieces = pieces.filter((p) => !placedPieceIds.has(p.id));

  return (
    <div class="bld-view">
      <div ref={figureRef} class={`bld-figure${ended ? ` bld-figure--${endAnimation}` : ''}`}>
        {slots.map((slot) => {
          const isFilled = Boolean(filled[slot.id]);
          const color = isFilled ? COLOR_HEX[slot.color] : undefined;
          const scale = figurePx / 100;
          const shapePxW = slot.w * scale;
          const shapePxH = slot.h * scale;
          // La zone tapable est toujours ≥ 72 px (§9), même quand la silhouette (fidèle à la figure)
          // est plus petite : la forme visuelle reste centrée, plus petite, à l'intérieur.
          const hitW = Math.max(MIN_HIT_PX, shapePxW);
          const hitH = Math.max(MIN_HIT_PX, shapePxH);
          return (
            <button
              key={slot.id}
              type="button"
              ref={registerSlot(slot.id)}
              data-choice={slot.id}
              data-shape={slot.shape}
              data-w={slot.w}
              data-h={slot.h}
              class="bld-slot-hit"
              style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${hitW}px`, height: `${hitH}px` }}
              disabled={isFilled}
              onClick={() => handleSlotTap(slot.id)}
            >
              <span
                class={`bld-slot bld-shape--${slot.shape}${isFilled ? ' bld-slot--filled' : ''}`}
                style={{ width: `${shapePxW}px`, height: `${shapePxH}px`, background: color }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div class="bld-tray">
        {trayPieces.map((piece) => {
          const offset = offsets[piece.id] ?? { x: 0, y: 0 };
          const maxDim = Math.max(piece.w, piece.h, 1);
          const scale = 60 / maxDim;
          const classes = [
            'bld-piece',
            dragging === piece.id ? 'bld-piece--dragging' : '',
            animatedOffset[piece.id] ? 'bld-piece--animated' : '',
            selected === piece.id ? 'bld-piece--selected' : '',
            failing === piece.id ? 'bld-piece--fail' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={piece.id}
              type="button"
              ref={registerPiece(piece.id)}
              data-choice={piece.id}
              data-shape={piece.shape}
              data-w={piece.w}
              data-h={piece.h}
              class={classes}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
              onPointerDown={handlePointerDown(piece.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={() => handlePieceTap(piece.id)}
            >
              <span
                class={`bld-shape--${piece.shape} bld-piece__shape`}
                style={{ width: `${piece.w * scale}%`, height: `${piece.h * scale}%`, background: COLOR_HEX[piece.color] }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
