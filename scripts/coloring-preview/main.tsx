// Planche de contrôle des coloriages (outil de développement, hors build) : pour chaque dessin
// demandé (?ids=house,tree ; tous par défaut), les 3 niveaux de détail, à colorier (dés du palier 4,
// le cas le plus encombrant) puis colorié (couleurs naturelles). Lancé par `npm run preview:coloring`.
import { render } from 'preact';
import '../../src/styles/global.css';
import { DRAWINGS } from '../../src/games/coloring/catalog';
import { DrawingView, visibleZones } from '../../src/games/coloring/DrawingView';
import { legendFor } from '../../src/games/coloring/variants';
import { COLORS } from '../../src/engine/types';
import type { Color } from '../../src/engine/types';
import type { Detail, Drawing } from '../../src/games/coloring/model';

const SIZE = Number(new URLSearchParams(location.search).get('size') ?? 320);
const ids = new URLSearchParams(location.search).get('ids')?.split(',').filter(Boolean);
const drawings = ids ? DRAWINGS.filter((d) => ids.includes(d.id)) : DRAWINGS;

function Sheet({ drawing, detail, painted }: { drawing: Drawing; detail: Detail; painted: boolean }) {
  const zones = visibleZones(drawing, detail);
  const targets = zones.map((z) => ({ id: z.id, target: z.palette[0] as Color }));
  const used = COLORS.filter((c) => targets.some((t) => t.target === c));
  return (
    <DrawingView
      drawing={drawing}
      detail={detail}
      tier={4}
      targets={targets}
      legend={painted ? null : legendFor(used, 4, 7)}
      painted={new Set(painted ? zones.map((z) => z.id) : [])}
      hints={{}}
      transient={null}
      celebrating={painted}
      reducedMotion
      sizePx={SIZE}
      interactive={false}
      onZoneTap={() => {}}
      showCodes={!painted}
    />
  );
}

function Board() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: '#fff7e8' }}>
      {drawings.map((drawing) => (
        <div key={drawing.id} data-drawing={drawing.id} style={{ padding: '56px 12px 12px', width: 'max-content' }}>
          <div style={{ font: '700 18px sans-serif', margin: '-44px 0 50px' }}>{drawing.id} : niveaux 1, 2, 3</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {([1, 2, 3] as Detail[]).map((detail) => (
              <div key={detail} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Sheet drawing={drawing} detail={detail} painted={false} />
                <Sheet drawing={drawing} detail={detail} painted />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

render(<Board />, document.getElementById('root') as HTMLElement);
