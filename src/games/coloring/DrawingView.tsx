// Le dessin (docs/specs/COLORIAGE.md §2.3, §2.4) : la feuille SVG, ses codes magiques (calque HTML
// au-dessus) et sa légende. Le tap est résolu ici (geometry.ts) : le tap direct sur un code, ou
// n'importe où ailleurs sur le SVG, aboutissent au même `resolveTap`.
import type { Color } from '../../engine/types';
import { resolveTap, type Point } from './geometry';
import type { CodeSymbol, Detail, Drawing, Layer, Primitive, Subject, ZoneLayer } from './model';
import { COLOR_HEX } from '../../ui/palette';
import type { ColoringTier } from '../../storage/colorings';
import { CodeMark } from './CodeMark';
import { Legend } from './Legend';
import '../../mechanics/builder/builder.css';
import './coloring.css';

/** Tout le dessin, aplati dans l'ordre de peinture (fond d'abord), filtré au niveau de détail. */
export function visibleLayers(drawing: Drawing, detail: Detail): Layer[] {
  const all = [...drawing.background, ...drawing.subjects.flatMap((s) => s.layers), ...(drawing.foreground ?? [])];
  return all.filter((l) => l.detail <= detail);
}

/** Les cases (calques "zone") visibles à ce niveau de détail. */
export function visibleZones(drawing: Drawing, detail: Detail): ZoneLayer[] {
  return visibleLayers(drawing, detail).filter((l): l is ZoneLayer => l.kind === 'zone');
}

/** Résolution d'un tap (docs/specs/COLORIAGE.md §3.2), utilisée pour les taps hors codes et le glisser. */
export function hitTestDrawing(
  drawing: Drawing,
  detail: Detail,
  painted: ReadonlySet<string>,
  point: Point,
  pxPerUnit: number,
): string | null {
  return resolveTap(point, visibleLayers(drawing, detail), painted, pxPerUnit);
}

function renderPrimitive(shape: Primitive, key: number) {
  switch (shape.kind) {
    case 'rect':
      return <rect key={key} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r ?? 0} />;
    case 'circle':
      return <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} />;
    case 'ellipse':
      return <ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
    case 'polygon':
      return <polygon key={key} points={shape.points.map(([x, y]) => `${x},${y}`).join(' ')} />;
    default:
      return null;
  }
}

const LIFE_CLASS: Record<string, string> = {
  pulse: 'clr-life-pulse',
  drift: 'clr-life-drift',
  bob: 'clr-life-bob',
  sway: 'clr-life-sway',
  twinkle: 'clr-life-twinkle',
};

const TRIP_CLASS: Partial<Record<string, string>> = {
  'slide-right': 'clr-trip-right',
  'slide-left': 'clr-trip-left',
  'slide-up': 'clr-trip-up',
};

export interface TransientZone {
  id: string;
  outcome: 'painted' | 'missed';
}

export interface DrawingViewProps {
  drawing: Drawing;
  detail: Detail;
  tier: ColoringTier;
  /** Cases et couleurs cibles, figées au lancement de la partie (record.zones). */
  targets: readonly { id: string; target: Color }[];
  legend: Partial<Record<Color, CodeSymbol>> | null;
  painted: ReadonlySet<string>;
  /** Aide en cours par case (0 aucune, 1 indice, 2 main déjà gérée par le parent). */
  hints: Readonly<Record<string, 0 | 1 | 2>>;
  /** Case en cours d'animation (peinte ou ratée), le temps de l'effet. */
  transient: TransientZone | null;
  celebrating: boolean;
  reducedMotion: boolean;
  /** Coté du dessin en px (mesuré par l'écran parent). */
  sizePx: number;
  /** Interactions actives : désactivées pendant une animation de tap et la fin de dessin. */
  interactive: boolean;
  onZoneTap: (zoneId: string) => void;
  /** Reçoit l'élément conteneur pour la mesure de rect (glisser depuis le récipient). */
  containerRef?: (el: HTMLDivElement | null) => void;
  /** Faux pour une vignette de l'écran de choix : sans codes ni légende (docs/specs/COLORIAGE.md §2.2). */
  showCodes?: boolean;
}

export function DrawingView(props: DrawingViewProps) {
  const {
    drawing,
    detail,
    tier,
    targets,
    legend,
    painted,
    hints,
    transient,
    celebrating,
    reducedMotion,
    sizePx,
    interactive,
    onZoneTap,
    showCodes = true,
  } = props;

  const targetById = new Map(targets.map((z) => [z.id, z.target]));
  const zones = visibleZones(drawing, detail);

  const handleSvgClick = (event: MouseEvent) => {
    if (!interactive) return;
    const container = event.currentTarget as SVGSVGElement;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const point: Point = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
    if (point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) return;
    const zoneId = hitTestDrawing(drawing, detail, painted, point, rect.width / 100);
    if (zoneId) onZoneTap(zoneId);
  };

  function fillFor(layer: Layer): string {
    if (layer.kind === 'zone') {
      const target = targetById.get(layer.id);
      return painted.has(layer.id) && target ? COLOR_HEX[target] : '#ffffff';
    }
    return '#ffffff';
  }

  function lifeClass(layer: Layer): string {
    if (!celebrating || reducedMotion || !layer.life) return '';
    return ` ${LIFE_CLASS[layer.life] ?? ''}`;
  }

  function renderLayer(layer: Layer, key: string) {
    if ('endOnly' in layer && layer.endOnly && !celebrating) return null;
    if (layer.kind === 'ink') {
      return (
        <path
          key={key}
          d={layer.d}
          fill={layer.filled ? 'var(--ink)' : 'none'}
          stroke={layer.filled ? 'none' : 'var(--ink)'}
          stroke-width={3}
          vector-effect="non-scaling-stroke"
          class={lifeClass(layer)}
        />
      );
    }
    const isZone = layer.kind === 'zone';
    const isTransient = isZone && transient?.id === layer.id;
    const classes = [
      isZone ? 'clr-zone' : 'clr-blank',
      lifeClass(layer),
      isTransient && transient ? (transient.outcome === 'painted' ? 'clr-zone--spread' : 'clr-zone--miss') : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <g key={key} class={classes} fill={fillFor(layer)} stroke="var(--ink)" stroke-width={isZone ? 0 : 0}>
        {layer.shape.map((shape, i) => renderPrimitive(shape, i))}
      </g>
    );
  }

  function subjectClass(subject: Subject, index: number): string {
    if (!celebrating) return '';
    if (reducedMotion) return '';
    const trip = TRIP_CLASS[subject.endAnimation];
    if (trip) return `clr-subject clr-subject--celebrating ${trip}`;
    return `clr-subject clr-subject--celebrating bld-figure--${subject.endAnimation}`;
  }

  const hintedZoneId = Object.entries(hints).find(([, v]) => v === 1)?.[0] ?? null;
  const hintedColor = hintedZoneId ? (targetById.get(hintedZoneId) ?? null) : null;

  return (
    <div
      class="clr-drawing"
      style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
      ref={(el) => props.containerRef?.(el as HTMLDivElement | null)}
    >
      {showCodes && tier >= 3 && legend && (
        <div class="clr-legend-bar">
          <Legend legend={legend} hinted={hintedColor} />
        </div>
      )}
      <svg viewBox="0 0 100 100" class="clr-svg" onClick={handleSvgClick}>
        {drawing.background.filter((l) => l.detail <= detail).map((l, i) => renderLayer(l, `bg-${i}`))}
        {drawing.subjects.map((subject, si) => (
          <g key={si} class={subjectClass(subject, si)}>
            {subject.layers.filter((l) => l.detail <= detail).map((l, i) => renderLayer(l, `s${si}-${i}`))}
          </g>
        ))}
        {(drawing.foreground ?? []).filter((l) => l.detail <= detail).map((l, i) => renderLayer(l, `fg-${i}`))}
        {celebrating && !reducedMotion && (
          <g class="bld-magic" aria-hidden="true">
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle, i) => (
              <circle
                key={angle}
                class="bld-magic__spark clr-spark"
                cx={50 + Math.cos((angle * Math.PI) / 180) * 2}
                cy={50 + Math.sin((angle * Math.PI) / 180) * 2}
                r={1.5}
                style={{ '--angle': `${angle}deg`, animationDelay: `${(i % 3) * 60}ms` }}
              />
            ))}
          </g>
        )}
      </svg>
      {showCodes &&
        !celebrating &&
        zones
          .filter((z) => !painted.has(z.id))
          .map((z) => {
            const target = targetById.get(z.id);
            if (!target) return null;
            const symbol = legend?.[target];
            return (
              <CodeMark
                key={z.id}
                zoneId={z.id}
                target={target}
                tier={tier}
                symbol={symbol}
                xPct={z.anchor.x}
                yPct={z.anchor.y}
                visualPx={Math.max(30, sizePx * 0.1)}
                hinted={hints[z.id] === 1}
                onTap={() => interactive && onZoneTap(z.id)}
              />
            );
          })}
    </div>
  );
}
