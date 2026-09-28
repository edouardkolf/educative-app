// Choix de la série (docs/specs/DICTEE.md §2.1) : une carte par série, celle proposée par défaut
// portant une bordure qui pulse et `aria-current`, centrée à l'affichage.
import { useEffect, useRef } from 'preact/hooks';
import { Emoji } from '../../ui/Emoji';
import { DICTATION_WORDS } from './words';
import { WORLD_META } from '../../screens/map/worlds';
import type { DictationSeries } from './types';

export interface SeriesPickerProps {
  series: readonly DictationSeries[];
  /** Série proposée par défaut (`defaultSeriesId`) : bordure qui pulse, `aria-current`, centrée. */
  currentId: string;
  onPick: (seriesId: string) => void;
}

function wordsLabel(series: DictationSeries): string {
  return series.words.map((id) => DICTATION_WORDS.get(id)?.text ?? id).join(', ');
}

export function SeriesPicker({ series, currentId, onPick }: SeriesPickerProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, [currentId]);

  return (
    <div class="dict-series-list">
      {series.map((s) => {
        const isCurrent = s.id === currentId;
        return (
          <button
            key={s.id}
            type="button"
            class={`dict-series-card${isCurrent ? ' dict-series-card--current' : ''}`}
            data-series={s.id}
            aria-current={isCurrent ? 'true' : undefined}
            ref={isCurrent ? currentRef : undefined}
            onClick={() => onPick(s.id)}
          >
            <span class="dict-series-card__number" aria-hidden="true">
              {s.number}
            </span>
            <span class="dict-series-card__words">{wordsLabel(s)}</span>
            {s.world && (
              <span class="dict-series-card__world" aria-hidden="true">
                <Emoji char={WORLD_META[s.world].icon} style={{ fontSize: '32px' }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
