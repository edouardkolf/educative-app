import { it } from 'vitest';
import { sceneContexts } from '../../MapScenery';
import { mountainShape, altitude } from '../../layout';
it('probe', () => {
  for (const [count, width] of [[80, 412], [80, 360], [47, 412]] as const) {
    const ctx = sceneContexts(count, width).find((c) => c.band.world === 'mountain')!;
    const shape = mountainShape(ctx.band, width, ctx.samples, ctx.nodes);
    console.log(count, width, 'band', ctx.band.top, ctx.band.bottom, 'summit', shape.summit, 'sign', ctx.sign, 'pin', ctx.passageIn, 'pout', ctx.passageOut);
    for (const row of shape.rows.filter((_, i) => i % 8 === 0)) console.log(' y', row.y, 't', altitude(shape.climb, row.y).toFixed(2), 'L', row.left.toFixed(0), 'R', row.right.toFixed(0));
    console.log(' nodes', ctx.levels.map((k) => `${k + 1}:${ctx.nodes[k]!.x.toFixed(0)},${ctx.nodes[k]!.y.toFixed(0)} t${altitude(shape.climb, ctx.nodes[k]!.y).toFixed(2)}`).join(' '));
  }
});
