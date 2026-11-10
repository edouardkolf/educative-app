// Décor de la carte : assemble les mondes (scenery/*.tsx) en un seul SVG en pixels, sous les niveaux.
// Ordre des calques, du fond vers l'avant : sols, frontières, chemins (chacun découpé à sa bande),
// ouvrages des frontières, lieux et décor, panneaux d'entrée, destination. Purement décoratif.
import { useMemo } from 'preact/hooks';
import {
  buildRoute,
  passages,
  samplePath,
  signPosition,
  smoothPathD,
  trackEnd,
  trackHeightFor,
  worldBands,
  type Point,
} from './layout';
import { WORLD_META } from './worlds';
import { DefaultEnd, WorldSign } from './scenery/common';
import { SCENES } from './scenery';
import type { SceneContext } from './scenery/types';

interface Props {
  count: number;
  width: number;
}

/** Contexte de chaque monde de la carte, du premier (en bas) au dernier. */
export function sceneContexts(count: number, width: number): SceneContext[] {
  if (count === 0 || width <= 0) return [];
  const route = buildRoute(count, width);
  const d = smoothPathD(route.points);
  const samples = samplePath(route.points);
  const nodes = route.nodeAt.map((k) => route.points[k] as Point);
  const passageList = passages(count, width);
  const bands = worldBands(count);
  return bands.map((band, i) => {
    const isLast = i === bands.length - 1;
    return {
      band,
      width,
      count,
      route,
      d,
      samples,
      bandSamples: samples.filter((p) => p.y >= band.top - 80 && p.y <= band.bottom + 80),
      nodes,
      levels: nodes.map((_, k) => k).filter((k) => nodes[k]!.y < band.bottom && nodes[k]!.y > band.top),
      sign: signPosition(band, width, count),
      passageIn: passageList.find((p) => p.worldIndex === band.worldIndex) ?? null,
      passageOut: passageList.find((p) => p.worldIndex === band.worldIndex + 1) ?? null,
      end: isLast && band.world !== 'mountain' ? trackEnd(count, width) : null,
    };
  });
}

export function MapScenery({ count, width }: Props) {
  const worlds = useMemo(
    () =>
      sceneContexts(count, width).map((ctx) => {
        const scene = SCENES[ctx.band.world];
        return { ctx, scene, prep: scene.prepare(ctx) };
      }),
    [count, width],
  );
  if (worlds.length === 0) return null;
  const height = trackHeightFor(count);
  const arrivals = worlds.slice(1).map((w, i) => ({ ...w, below: worlds[i]!.ctx, passage: w.ctx.passageIn! }));
  const last = worlds[worlds.length - 1]!;

  return (
    <svg
      class="map-scenery"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      data-testid="map-scenery"
    >
      <defs>
        {worlds.map(({ ctx }) => (
          <clipPath key={ctx.band.worldIndex} id={`map-band-${ctx.band.worldIndex}`}>
            <rect x="-50" y={ctx.band.top} width={width + 100} height={ctx.band.bottom - ctx.band.top} />
          </clipPath>
        ))}
      </defs>
      {worlds.map(({ ctx, scene, prep }) => (
        <g key={`ground-${ctx.band.worldIndex}`} data-world={ctx.band.world} data-layer="ground">
          <scene.Ground ctx={ctx} prep={prep} />
        </g>
      ))}
      {arrivals.map(({ ctx, scene, below, passage }) =>
        scene.Border ? (
          <g key={`border-${ctx.band.worldIndex}`} data-testid="map-border">
            <scene.Border passage={passage} ctx={ctx} below={below} />
          </g>
        ) : null,
      )}
      {worlds.map(({ ctx, scene, prep }) => (
        <g key={`path-${ctx.band.worldIndex}`} clip-path={`url(#map-band-${ctx.band.worldIndex})`} data-layer="path">
          <scene.Path ctx={ctx} prep={prep} />
        </g>
      ))}
      {arrivals.map(({ ctx, scene, below, passage }) =>
        scene.Passage ? (
          <g key={`passage-${ctx.band.worldIndex}`} data-testid="map-passage">
            <scene.Passage passage={passage} ctx={ctx} below={below} />
          </g>
        ) : null,
      )}
      {[...worlds].reverse().map(({ ctx, scene, prep }) => (
        <g key={`above-${ctx.band.worldIndex}`} data-layer="above">
          <scene.Above ctx={ctx} prep={prep} />
          <WorldSign x={ctx.sign.x} y={ctx.sign.y} icon={WORLD_META[ctx.band.world].icon} />
        </g>
      ))}
      {last.ctx.end &&
        (last.scene.End ? (
          <g data-testid="map-end">
            <last.scene.End ctx={last.ctx} prep={last.prep} at={last.ctx.end} />
          </g>
        ) : (
          <DefaultEnd at={last.ctx.end} />
        ))}
    </svg>
  );
}
