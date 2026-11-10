// Planche de contrôle de la carte (npm run preview:map) : le vrai décor, avec des disques à la place des niveaux.
import { render } from 'preact';
import '../../src/styles/global.css';
import { MapScenery } from '../../src/screens/map/MapScenery';
import { WorldBackdrop } from '../../src/screens/map/WorldBackdrop';
import { WORLD_ORDER, nodePosition, trackHeightFor } from '../../src/screens/map/layout';

const params = new URLSearchParams(location.search);
const count = Number(params.get('count') ?? 80);
const width = Number(params.get('width') ?? 412);

function Map() {
  return (
    <div data-map style={{ position: 'relative', width, height: trackHeightFor(count), overflow: 'hidden' }}>
      <MapScenery count={count} width={width} />
      {Array.from({ length: count }, (_, i) => {
        const p = nodePosition(i, count, width);
        return (
          <div class="node" style={{ left: p.x, top: p.y }}>
            <span>{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function Backdrops() {
  return (
    <div class="backdrops">
      {WORLD_ORDER.map((w) => (
        <div data-backdrop={w}>
          <WorldBackdrop world={w} />
        </div>
      ))}
    </div>
  );
}

render(params.get('backdrops') ? <Backdrops /> : <Map />, document.getElementById('app')!);
