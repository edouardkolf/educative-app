import { describe, expect, it } from 'vitest';
import {
  BRIDGE_HALF,
  LEVELS_PER_WORLD,
  NODE_SIZE,
  PATH_WIDTH,
  RIVER_HALF,
  bridges,
  buildRoute,
  nodePosition,
  pointBetweenNodes,
  pointOnSegment,
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
    const { points, nodeAt } = buildRoute(count, WIDTH);
    expect(nodeAt).toHaveLength(count);
    nodeAt.forEach((k, i) => expect(points[k]).toEqual(nodePosition(i, count, WIDTH)));
    expect(points[0]!.y).toBeGreaterThan(trackHeightFor(count));
    expect(points[points.length - 1]!.y).toBeLessThan(0);
    expect(pathWaypoints(count, WIDTH)).toEqual(points);
    const d = smoothPathD(points);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.match(/ C /g)).toHaveLength(points.length - 1);
  });

  it('reste dans la carte et varie : zigzags, traversées et virages', () => {
    const count = LEVELS_PER_WORLD * 3;
    const { points } = buildRoute(count, WIDTH);
    for (const p of points.slice(1, -1)) {
      expect(p.x).toBeGreaterThanOrEqual(WIDTH * 0.1);
      expect(p.x).toBeLessThanOrEqual(WIDTH * 0.9);
    }
    const dx = Array.from(
      { length: count - 1 },
      (_, i) => nodePosition(i + 1, count, WIDTH).x - nodePosition(i, count, WIDTH).x,
    );
    const turns = dx.slice(1).filter((v, i) => Math.sign(v) !== Math.sign(dx[i]!)).length;
    const runs = dx.slice(1).filter((v, i) => Math.abs(v) > 20 && Math.sign(v) === Math.sign(dx[i]!)).length;
    expect(turns).toBeGreaterThan(5); // des zigzags…
    expect(runs).toBeGreaterThan(3); // …et des traversées dans un même sens
    expect(new Set(dx.map((v) => Math.round(Math.abs(v) / 20))).size).toBeGreaterThan(4); // angles variés
    expect(points.length).toBeGreaterThan(count + 2 + 2 * 2); // des virages intercalés entre niveaux
  });

  it('est stable : même tracé quel que soit le nombre de niveaux', () => {
    expect(nodePosition(7, 10, WIDTH).x).toBe(nodePosition(7, 40, WIDTH).x);
  });
});

describe('pont entre deux mondes', () => {
  const count = LEVELS_PER_WORLD * 2 + 3;
  const route = buildRoute(count, WIDTH);
  const list = bridges(count, WIDTH);

  it('un pont par frontière, posé sur la rivière', () => {
    expect(list).toHaveLength(2);
    const bands = worldBands(count);
    list.forEach((bridge) => expect(bridge.y).toBe(bands[bridge.worldIndex]!.bottom));
  });

  it('le chemin le franchit en ligne droite', () => {
    for (const bridge of list) {
      const last = bridge.worldIndex * LEVELS_PER_WORLD - 1;
      const start = route.nodeAt[last]!;
      // Le segment qui enjambe la rivière est le 2e entre les deux niveaux.
      expect(route.points[start + 1]).toEqual({
        x: bridge.x,
        y: bridge.y + BRIDGE_HALF,
      });
      for (let t = 0; t <= 1; t += 0.1) expect(pointOnSegment(route.points, start + 1, t).x).toBeCloseTo(bridge.x, 6);
      expect(BRIDGE_HALF).toBeGreaterThan(RIVER_HALF);
    }
  });

  it("l'avatar va d'un niveau au suivant en passant par le pont", () => {
    const from = LEVELS_PER_WORLD - 1;
    const a = nodePosition(from, count, WIDTH);
    const b = nodePosition(from + 1, count, WIDTH);
    expect(pointBetweenNodes(route, from, 0)).toEqual(a);
    const end = pointBetweenNodes(route, from, 1);
    expect(end.x).toBeCloseTo(b.x, 6);
    expect(end.y).toBeCloseTo(b.y, 6);
    const mid = pointBetweenNodes(route, from, 0.5);
    expect(mid.x).toBeCloseTo(list[0]!.x, 0);
    expect(Math.abs(mid.y - list[0]!.y)).toBeLessThan(BRIDGE_HALF);
  });
});

describe('décor', () => {
  const count = LEVELS_PER_WORLD * 2 + 4;
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
        if (band.worldIndex > 0) expect(item.y).toBeLessThan(band.bottom - RIVER_HALF);
      }
    }
  });

  it('est stable : même carte à chaque visite', () => {
    const band = bands[0]!;
    expect(placeDecor(band, WIDTH, samples, nodes)).toEqual(placeDecor(band, WIDTH, samples, nodes));
  });
});
