import { describe, expect, it } from 'vitest';
import {
  BACKDROP_HEIGHT,
  BORDER_HALF,
  BORDER_SPACING,
  DECOR_KINDS,
  LEVELS_PER_WORLD,
  NODE_SIZE,
  PATH_WIDTH,
  PASSAGE_HALF,
  SPACING,
  SPACING_JITTER,
  passages,
  buildRoute,
  nodePosition,
  pointBetweenNodes,
  pointOnSegment,
  pathWaypoints,
  pathStones,
  backdropDecor,
  placeDecor,
  samplePath,
  smoothPathD,
  trackHeightFor,
  worldBands,
  worldIdAt,
  worldIndexForLevel,
  WORLD_ORDER,
  MOUNTAIN_SNOW_FROM,
  MOUNTAIN_TAPER_START,
  MOUNTAIN_ZONES,
  altitude,
  mountainKindsAt,
  mountainShape,
  onMountain,
  SUMMIT_RISE,
  SUMMIT_SPACING,
  SWITCHBACK_SPACING,
  TRAVERSE_RISE,
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
    expect(worldIdAt(3)).toBe('clouds');
    expect(worldIdAt(4)).toBe('forest');
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

describe('écart entre niveaux', () => {
  it('varie autour de SPACING, sans jamais serrer les niveaux', () => {
    const count = LEVELS_PER_WORLD * 3;
    const gaps = Array.from(
      { length: count - 1 },
      (_, i) => nodePosition(i, count, WIDTH).y - nodePosition(i + 1, count, WIDTH).y,
    );
    // Hors montagne (monde 2), où les niveaux vont par deux sur des traversées en lacets.
    const inner = gaps.filter((_, i) => (i + 1) % LEVELS_PER_WORLD !== 0 && worldIndexForLevel(i) !== 2);
    for (const g of inner) {
      expect(g).toBeGreaterThanOrEqual(Math.floor(SPACING * (1 - SPACING_JITTER)));
      expect(g).toBeLessThanOrEqual(Math.ceil(SPACING * (1 + SPACING_JITTER)));
      expect(g).toBeGreaterThan(NODE_SIZE + 40); // place pour le disque et ses étoiles
    }
    expect(new Set(inner).size).toBeGreaterThan(10);
    // Plus de place autour de chaque frontière, pour le passage.
    expect(gaps[LEVELS_PER_WORLD - 1]).toBe(BORDER_SPACING);
  });

  it('la carte a la bonne hauteur', () => {
    const count = 20;
    expect(nodePosition(count - 1, count, WIDTH).y).toBe(120);
    expect(nodePosition(0, count, WIDTH).y).toBe(trackHeightFor(count) - 140);
  });
});

describe('passage entre deux mondes', () => {
  const count = LEVELS_PER_WORLD * 4 + 3;
  const route = buildRoute(count, WIDTH);
  const list = passages(count, WIDTH);

  it('un passage par frontière, adapté au monde d’arrivée', () => {
    expect(list.map((p) => [p.world, p.kind])).toEqual([
      ['sea', 'pier'],
      ['mountain', 'pass'],
      ['clouds', 'summit'],
      ['forest', 'bridge'],
    ]);
    const bands = worldBands(count);
    list.forEach((p) => expect(p.y).toBe(bands[p.worldIndex]!.bottom));
  });

  it('le chemin le franchit en ligne droite, loin des niveaux', () => {
    for (const passage of list) {
      const last = passage.worldIndex * LEVELS_PER_WORLD - 1;
      const start = route.nodeAt[last]!;
      // Le segment qui franchit la frontière est le 2e entre les deux niveaux.
      expect(route.points[start + 1]).toEqual({ x: passage.x, y: passage.y + PASSAGE_HALF });
      for (let t = 0; t <= 1; t += 0.1) expect(pointOnSegment(route.points, start + 1, t).x).toBeCloseTo(passage.x, 6);
      expect(PASSAGE_HALF).toBeGreaterThan(BORDER_HALF);
      const below = nodePosition(last, count, WIDTH);
      expect(below.y - NODE_SIZE / 2).toBeGreaterThan(passage.y + PASSAGE_HALF);
      const above = nodePosition(last + 1, count, WIDTH);
      expect(above.y + NODE_SIZE / 2 + 16).toBeLessThan(passage.y - PASSAGE_HALF); // étoiles comprises
    }
  });

  it("l'avatar va d'un niveau au suivant en franchissant le passage", () => {
    const from = LEVELS_PER_WORLD - 1;
    const a = nodePosition(from, count, WIDTH);
    const b = nodePosition(from + 1, count, WIDTH);
    expect(pointBetweenNodes(route, from, 0)).toEqual(a);
    const end = pointBetweenNodes(route, from, 1);
    expect(end.x).toBeCloseTo(b.x, 6);
    expect(end.y).toBeCloseTo(b.y, 6);
    const mid = pointBetweenNodes(route, from, 0.5);
    expect(mid.x).toBeCloseTo(list[0]!.x, 0);
    expect(Math.abs(mid.y - list[0]!.y)).toBeLessThan(PASSAGE_HALF);
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
        if (band.worldIndex > 0) expect(item.y).toBeLessThan(band.bottom - BORDER_HALF);
      }
    }
  });

  it('est stable : même carte à chaque visite', () => {
    const band = bands[0]!;
    expect(placeDecor(band, WIDTH, samples, nodes)).toEqual(placeDecor(band, WIDTH, samples, nodes));
  });
});

describe('backdropDecor', () => {
  it('donne un fond garni, stable et propre à chaque monde', () => {
    for (const world of WORLD_ORDER) {
      const decor = backdropDecor(world);
      expect(decor.length).toBeGreaterThan(12);
      expect(backdropDecor(world)).toEqual(decor);
      const allowed = new Set(DECOR_KINDS[world].map((k) => k.kind));
      expect(decor.every((d) => allowed.has(d.kind))).toBe(true);
    }
    expect(backdropDecor('forest')).not.toEqual(backdropDecor('sea'));
  });

  it('couvre toute la hauteur du fond', () => {
    const ys = backdropDecor('forest').map((d) => d.y);
    expect(Math.min(...ys)).toBeLessThan(BACKDROP_HEIGHT * 0.2);
    expect(Math.max(...ys)).toBeGreaterThan(BACKDROP_HEIGHT * 0.8);
  });
});

describe('cailloux du sentier', () => {
  const count = LEVELS_PER_WORLD * 2 + 4;
  const route = buildRoute(count, WIDTH);
  const samples = samplePath(route.points);
  const nodes = route.nodeAt.map((k) => route.points[k] as { x: number; y: number });
  const crossings = passages(count, WIDTH);
  const stones = pathStones(samples, nodes, crossings);

  it('sème des cailloux, de façon déterministe', () => {
    expect(stones.length).toBeGreaterThan(20);
    expect(pathStones(samples, nodes, crossings)).toEqual(stones);
  });

  it('mêle surtout des cailloux, quelques tas, de rares dalles', () => {
    const n = (kind: string) => stones.filter((s) => s.kind === kind).length;
    expect(n('rock')).toBeGreaterThan(n('heap'));
    expect(n('heap')).toBeGreaterThan(0);
    expect(n('heap')).toBeGreaterThanOrEqual(n('slab'));
  });

  it('restent sur le sentier, jamais sous un niveau ni sur un passage', () => {
    const fine = samplePath(route.points, 60);
    for (const stone of stones) {
      const toPath = Math.min(...fine.map((p) => Math.hypot(p.x - stone.x, p.y - stone.y)));
      expect(toPath + stone.rx).toBeLessThanOrEqual(PATH_WIDTH / 2);
      const toNode = Math.min(...nodes.map((p) => Math.hypot(p.x - stone.x, p.y - stone.y)));
      expect(toNode).toBeGreaterThan(NODE_SIZE / 2);
      for (const c of crossings) expect(Math.hypot(c.x - stone.x, c.y - stone.y)).toBeGreaterThan(PASSAGE_HALF);
    }
  });
});

describe('montagne', () => {
  it("laisse la place au sommet, au ciel et à l'échelle avant les nuages", () => {
    const count = LEVELS_PER_WORLD * 4;
    const summit = nodePosition(3 * LEVELS_PER_WORLD - 1, count, WIDTH);
    const clouds = nodePosition(3 * LEVELS_PER_WORLD, count, WIDTH);
    expect(summit.y - clouds.y).toBe(SUMMIT_SPACING);
    expect(clouds.x).toBe(summit.x); // l'échelle monte tout droit
  });

  // Montagne complète (un monde de nuages au-dessus) et montagne en fin de parcours (sommet en haut de carte).
  for (const count of [LEVELS_PER_WORLD * 3 + 2, LEVELS_PER_WORLD * 2 + 10]) {
    const route = buildRoute(count, WIDTH);
    const samples = samplePath(route.points);
    const nodes = route.nodeAt.map((k) => route.points[k]!);
    const band = worldBands(count)[2]!;
    const shape = mountainShape(band, WIDTH, samples, nodes);

    it(`garde le chemin et les niveaux sur la roche (${count} niveaux)`, () => {
      for (const p of samples) {
        // Au-dessus du dernier niveau : le chemin file vers la pointe puis l'échelle, dans le ciel.
        if (p.y < shape.summit.y + SUMMIT_RISE - NODE_SIZE / 2 || p.y > band.bottom) continue;
        expect(onMountain(shape, p.x - PATH_WIDTH / 2, p.y)).toBe(true);
        expect(onMountain(shape, p.x + PATH_WIDTH / 2, p.y)).toBe(true);
      }
      for (const n of nodes) {
        if (n.y < band.top || n.y > band.bottom) continue;
        expect(onMountain(shape, n.x - NODE_SIZE / 2, n.y)).toBe(true);
        expect(onMountain(shape, n.x + NODE_SIZE / 2, n.y)).toBe(true);
      }
    });

    it(`se resserre jusqu'à une pointe, avec du ciel au-dessus (${count} niveaux)`, () => {
      const top = shape.rows[0]!;
      const foot = shape.rows[shape.rows.length - 1]!;
      expect(foot.left).toBeLessThan(0);
      expect(foot.right).toBeGreaterThan(WIDTH);
      expect(top.y).toBe(shape.summit.y);
      expect(top.right - top.left).toBeLessThan(40);
      expect(shape.summit.y).toBeGreaterThan(band.top);
      expect(onMountain(shape, shape.summit.x, shape.summit.y - 10)).toBe(false);
      const highest = Math.min(...nodes.filter((n) => n.y > band.top && n.y < band.bottom).map((n) => n.y));
      expect(shape.summit.y).toBe(highest - SUMMIT_RISE);
    });

    it(`deux niveaux par traversée, un lacet serré entre deux traversées (${count} niveaux)`, () => {
      const first = 2 * LEVELS_PER_WORLD;
      const last = Math.min(count, 3 * LEVELS_PER_WORLD) - 1;
      for (let i = first; i < last; i += 1) {
        const a = nodePosition(i, count, WIDTH);
        const b = nodePosition(i + 1, count, WIDTH);
        if (i % 2 === 0) {
          expect(a.y - b.y).toBe(TRAVERSE_RISE); // même traversée, presque à plat
          expect(Math.abs(a.x - b.x)).toBeGreaterThan(NODE_SIZE + 12); // côte à côte, sans se toucher
        } else {
          expect(a.y - b.y).toBe(SWITCHBACK_SPACING);
          expect(SWITCHBACK_SPACING).toBeGreaterThan(NODE_SIZE + 40); // place pour le disque et ses étoiles
        }
      }
      for (const p of route.points) {
        expect(p.x).toBeGreaterThanOrEqual(WIDTH * 0.1 - 0.001);
        expect(p.x).toBeLessThanOrEqual(WIDTH * 0.9 + 0.001);
      }
    });

    it(`étage le décor : ciel à côté, neige en haut, pics loin du chemin (${count} niveaux)`, () => {
      const decor = placeDecor(band, WIDTH, samples, nodes, mountainKindsAt(band, shape));
      expect(decor.length).toBeGreaterThan(10);
      const sky = new Set<string>(MOUNTAIN_ZONES.sky.map((k) => k.kind));
      const snow = new Set<string>(MOUNTAIN_ZONES.snow.map((k) => k.kind));
      for (const item of decor) {
        if (!onMountain(shape, item.x, item.y)) expect(sky.has(item.kind)).toBe(true);
        else if (altitude(band, item.y) >= MOUNTAIN_SNOW_FROM) expect(snow.has(item.kind)).toBe(true);
        else expect(sky.has(item.kind)).toBe(false);
        if (item.kind === 'peak') {
          const tip = { x: item.x, y: item.y - 60 * item.scale };
          const minPath = Math.min(...samples.map((p) => Math.hypot(p.x - tip.x, p.y - tip.y)));
          expect(minPath).toBeGreaterThan(PATH_WIDTH / 2);
        }
      }
      expect(decor.some((d) => sky.has(d.kind))).toBe(true);
      const meadow = new Set<string>(['pine', 'flower', 'grass']);
      expect(decor.some((d) => meadow.has(d.kind))).toBe(true); // la prairie au pied
    });
  }
});
