// Le frigo (docs/specs/COLORIAGE.md §2.5) : grille 3 × 4 des 12 derniers dessins terminés. Un tap sur
// un dessin l'agrandit et rejoue sa prise de vie ; un nouveau tap, ou le bouton frigo, revient.
import { useState } from 'preact/hooks';
import type { ColoringRecord } from '../../storage/colorings';
import type { Drawing } from './model';
import { DrawingView } from './DrawingView';
import './coloring-screen.css';

const TILE_PX = 76;
const OPEN_PX = 280;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export interface FridgeProps {
  items: readonly ColoringRecord[];
  findDrawing: (id: string) => Drawing | undefined;
}

/** La porte du frigo, sans texte ni nombre (docs/specs/COLORIAGE.md §2.5). */
export function Fridge({ items, findDrawing }: FridgeProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reducedMotion = prefersReducedMotion();

  if (openIndex !== null) {
    const record = items[openIndex];
    const drawing = record && findDrawing(record.drawingId);
    if (record && drawing) {
      return (
        <div class="clr-fridge-open" onClick={() => setOpenIndex(null)}>
          <DrawingView
            drawing={drawing}
            detail={record.detail}
            tier={record.tier}
            targets={record.zones}
            legend={null}
            painted={new Set(record.zones.map((z) => z.id))}
            hints={{}}
            transient={null}
            celebrating
            reducedMotion={reducedMotion}
            sizePx={OPEN_PX}
            interactive={false}
            onZoneTap={() => {}}
            showCodes={false}
          />
        </div>
      );
    }
  }

  return (
    <div class="clr-fridge-grid">
      {items.map((record, index) => {
        const drawing = findDrawing(record.drawingId);
        if (!drawing) return null;
        return (
          <button
            key={record.id}
            type="button"
            class="clr-fridge-tile"
            data-testid="fridge-item"
            onClick={() => setOpenIndex(index)}
          >
            <span class="clr-fridge-magnet" aria-hidden="true" />
            <DrawingView
              drawing={drawing}
              detail={record.detail}
              tier={record.tier}
              targets={record.zones}
              legend={null}
              painted={new Set(record.zones.map((z) => z.id))}
              hints={{}}
              transient={null}
              celebrating={false}
              reducedMotion
              sizePx={TILE_PX}
              interactive={false}
              onZoneTap={() => {}}
              showCodes={false}
            />
          </button>
        );
      })}
    </div>
  );
}
