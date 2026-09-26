// Dessine une scène « Lis et montre » : un support (table/chaise/carton/lit/arbre) et un sujet
// (émoji, 1 ou 3 exemplaires) posé selon une relation spatiale (sur, sous, à côté, devant — voir ANCHOR_RELATIONS).
// Chaque position doit se distinguer sans ambiguïté des autres, pour le même support, à 140 px.
import type { AnchorId, Relation } from '../../engine/types';
import type { Placement, Scene as SceneData } from './types';

const GROUND_Y = 88;

/** Un « emplacement » pour un exemplaire du sujet : centre, échelle, et ordre de dessin
 * (« back » = dessiné avant le support, qui peut donc le recouvrir partiellement).
 * `layout` régit la disposition du groupe quand count = 3 : "row" = alignés (au centre de la
 * case), "cluster" = petit triangle compact (près d'un bord, pour ne jamais déborder la carte). */
interface Slot {
  x: number;
  y: number;
  scale: number;
  z: 'front' | 'back';
  /** "row" (défaut) : alignés, écart normal. "cluster" : petit triangle compact près d'un bord. */
  layout?: 'row' | 'cluster';
}

// Emplacement de base (avant duplication pour count = 3) par support et par relation.
// Coordonnées dans un viewBox 0 0 100 100. Réglées à l'œil pour rester lisibles à 140 px.
const SLOTS: Record<AnchorId, Partial<Record<Relation, Slot>>> = {
  table: {
    on: { x: 50, y: 44, scale: 1, z: 'front' }, // posé sur le plateau, touche le bois
    under: { x: 50, y: 68, scale: 0.8, z: 'front' }, // entre les pieds, sous le plateau
    beside: { x: 84, y: 82, scale: 1, z: 'front', layout: 'cluster' }, // au sol, à droite, séparé
  },
  chair: {
    on: { x: 50, y: 63, scale: 0.8, z: 'front' }, // assis sur l'assise (pas le dossier)
    beside: { x: 84, y: 82, scale: 1, z: 'front', layout: 'cluster' },
  },
  box: {
    on: { x: 50, y: 50, scale: 0.85, z: 'front' }, // posé sur le couvercle
    beside: { x: 84, y: 82, scale: 1, z: 'front', layout: 'cluster' },
    'in-front': { x: 50, y: 93, scale: 1.2, z: 'front' },
  },
  bed: {
    on: { x: 50, y: 70, scale: 0.8, z: 'front' }, // posé sur le matelas, touche la couette
    beside: { x: 84, y: 80, scale: 1, z: 'front', layout: 'cluster' },
  },
  tree: {
    beside: { x: 84, y: 80, scale: 1, z: 'front', layout: 'cluster' },
    'in-front': { x: 50, y: 90, scale: 1.2, z: 'front' },
  },
};

// Écart horizontal (unités de viewBox) entre les 3 exemplaires en rangée (count = 3).
const ROW_SPACING = 15;
const GROUP_SCALE = 0.85;

// Petit triangle compact (2 devant + 1 derrière, centré), pour les groupes proches d'un bord de carte
// (beside) : jamais large, jamais tronqué par le bord de la case.
const CLUSTER_OFFSETS = [
  { dx: -8, dy: 6 },
  { dx: 8, dy: 6 },
  { dx: 0, dy: -8 },
];

function slotsFor(anchor: AnchorId, relation: Relation, count: 1 | 3): Slot[] {
  const base = SLOTS[anchor][relation];
  if (!base) return [];
  if (count === 1) return [base];
  const scale = base.scale * GROUP_SCALE;
  if (base.layout === 'cluster') {
    return CLUSTER_OFFSETS.map((o) => ({ x: base.x + o.dx, y: base.y + o.dy, scale, z: base.z }));
  }
  return [-1, 0, 1].map((i) => ({ x: base.x + i * ROW_SPACING, y: base.y, scale, z: base.z }));
}

/** Le support : dessiné au centre-bas de la case. La table est un SVG simple, les autres sont des émojis. */
function Support({ anchor }: { anchor: AnchorId }) {
  if (anchor === 'table') {
    return (
      <g aria-hidden="true">
        <rect x={22} y={44} width={56} height={6} rx={2} fill="#8b5e34" />
        <rect x={26} y={50} width={10} height={32} fill="#6b431f" />
        <rect x={64} y={50} width={10} height={32} fill="#6b431f" />
      </g>
    );
  }
  const config: Record<Exclude<AnchorId, 'table'>, { emoji: string; y: number; fs: number }> = {
    chair: { emoji: '🪑', y: 84, fs: 50 },
    box: { emoji: '📦', y: 84, fs: 46 },
    bed: { emoji: '🛏️', y: 80, fs: 44 },
    tree: { emoji: '🌳', y: 86, fs: 58 },
  };
  const { emoji, y, fs } = config[anchor];
  return (
    <text x={50} y={y} font-size={fs} text-anchor="middle" class="rd-emoji" aria-hidden="true">
      {emoji}
    </text>
  );
}

function Subject({ emoji, slot, subjectFs }: { emoji: string; slot: Slot; subjectFs: number }) {
  return (
    <text
      x={slot.x}
      y={slot.y}
      font-size={subjectFs * slot.scale}
      text-anchor="middle"
      class="rd-emoji"
      aria-hidden="true"
    >
      {emoji}
    </text>
  );
}

// Étendue verticale réellement utilisée par le contenu (supports + sujets), toutes relations
// confondues : de ~26 (haut d'un sujet « on ») à ~95 (bas d'un sujet « in-front »).
// En mode compact (2 phrases empilées), le viewBox est recadré sur cette zone pour que chaque
// sujet reste lisible malgré la case deux fois plus basse (au lieu d'un carré 0 0 100 100 dont
// la moitié serait vide une fois la case divisée en deux).
const COMPACT_VIEWBOX = '0 22 100 76';

/** Une mini-scène (un support + son sujet), pour un placement.
 * `compact` : recadre le viewBox (voir COMPACT_VIEWBOX) quand deux scènes sont empilées dans la même case. */
function PlacementScene({ placement, compact }: { placement: Placement; compact: boolean }) {
  const { emoji, count, relation, anchor } = placement;
  const slots = slotsFor(anchor, relation, count);
  const subjectFs = 20; // sujet ~45 % de la taille du support (support ~44-58)
  const back = slots.filter((s) => s.z === 'back');
  const front = slots.filter((s) => s.z === 'front');
  return (
    <svg
      viewBox={compact ? COMPACT_VIEWBOX : '0 0 100 100'}
      class="rd-scene"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={8} y1={GROUND_Y} x2={92} y2={GROUND_Y} class="rd-ground" />
      {back.map((slot, i) => (
        <Subject key={`b${i}`} emoji={emoji} slot={slot} subjectFs={subjectFs} />
      ))}
      <Support anchor={anchor} />
      {front.map((slot, i) => (
        <Subject key={`f${i}`} emoji={emoji} slot={slot} subjectFs={subjectFs} />
      ))}
    </svg>
  );
}

/** Une scène complète : 1 placement = une scène pleine case ; 2 placements = deux mini-scènes
 * empilées (l'une au-dessus de l'autre, séparées d'un fin trait), chacune recadrée pour rester lisible. */
export function Scene({ scene }: { scene: SceneData }) {
  if (scene.placements.length <= 1) {
    return (
      <div class="rd-scene-frame">
        {scene.placements[0] ? <PlacementScene placement={scene.placements[0]} compact={false} /> : null}
      </div>
    );
  }
  return (
    <div class="rd-scene-frame rd-scene-frame--split">
      {scene.placements.map((placement, i) => (
        <div class="rd-scene-half" key={i}>
          <PlacementScene placement={placement} compact />
        </div>
      ))}
    </div>
  );
}
