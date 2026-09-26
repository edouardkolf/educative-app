import { describe, expect, it } from 'vitest';
import {
  LEVELS_PER_WORLD,
  NODE_SIZE,
  PATH_WIDTH,
  nodePosition,
  pathWaypoints,
  placeDecor,
  samplePath,
  smoothPathD,
  trackHeightFor,
  worldBands,
  worldIdAt,
  worldIndexForLevel,
} from './layout';

const WIDTH = 412;

describe('mondes', () => {
  it('change de monde tous les LEVELS_PER_WORLD niveaux, puis reboucle', () => {
    expect(worldIndexForLevel(0)).toBe(0);
    expect(worldIndexForLevel(LEVELS_PER_WORLD - 1)).toBe(0);
    expect(worldIndexForLevel(LEVELS_PER_WORLD)).toBe(1);
    expect(worldIdAt(0)).toBe('forest');
    expect(worldIdAt(1)).toBe('sea');
    expect(worldIdAt(2)).toBe('mountain');
    expect(worldIdAt(3)).toBe('forest');
  });

  it('les bandes couvrent toute la hauteur, sans trou, et contiennent leurs niveaux', () => {
    const count = LEVELS_PER_WORLD * 2 + 3;
    const bands = worldBands(count);
    expect(bands).toHaveLength(3);
    expect(bands[0]?.bottom).toBe(trackHeightFor(count));
    expect(bands[bands.length - 1]?.top).toBe(0);
    for (let i = 1; i < bands.length; i += 1) expect(bands[i]?.bottom).toBe(bands[i - 1]?.top);
    for (let i = 0; i < count; i += 1) {
      const band = bands[worldIndexForLevel(i)]!;
      const { y } = nodePosition(i, count, WIDTH);
      expect(y).toBeGreaterThan(band.top);
      expect(y).toBeLessThan(band.bottom);
    }
  });

  it('aucune bande pour un parcours vide', () => {
    expect(worldBands(0)).toEqual([]);
  });
});

describe('chemin', () => {
  it('passe par chaque niveau et sort de la carte en haut comme en bas', () => {
    const count = 5;
    const points = pathWaypoints(count, WIDTH);
    expect(points).toHaveLength(count + 2);
    expect(points[0]!.y).toBeGreaterThan(trackHeightFor(count));
    expect(points[points.length - 1]!.y).toBeLessThan(0);
    const d = smoothPathD(points);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.match(/ C /g)).toHaveLength(points.length - 1);
  });
});

describe('décor', () => {
  const count = LEVELS_PER_WORLD + 4;
  const samples = samplePath(pathWaypoints(count, WIDTH));
  const nodes = Array.from({ length: count }, (_, i) => nodePosition(i, count, WIDTH));
  const bands = worldBands(count);

  it('ne déborde ni sur le chemin ni sur les niveaux', () => {
    for (const band of bands) {
      const decor = placeDecor(band, WIDTH, samples, nodes);
      expect(decor.length).toBeGreaterThan(10);
      for (const item of decor) {
        const minPath = Math.min(...samples.map((p) => Math.hypot(p.x - item.x, p.y - item.y)));
        expect(minPath).toBeGreaterThan(PATH_WIDTH / 2);
        const minNode = Math.min(...nodes.map((p) => Math.hypot(p.x - item.x, p.y - item.y)));
        expect(minNode).toBeGreaterThan(NODE_SIZE / 2);
        expect(item.y).toBeGreaterThanOrEqual(band.top);
        expect(item.y).toBeLessThanOrEqual(band.bottom);
      }
    }
  });

  it('est stable : même carte à chaque visite', () => {
    const band = bands[0]!;
    expect(placeDecor(band, WIDTH, samples, nodes)).toEqual(placeDecor(band, WIDTH, samples, nodes));
  });
});
