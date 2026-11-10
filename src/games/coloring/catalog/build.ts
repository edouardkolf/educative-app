// Aides de construction d'un dessin (docs/specs/COLORIAGE.md §4.4-4.5). Pures, sans état : elles ne
// font que fabriquer les objets du modèle (`model.ts`). Utilisées par chaque `catalog/<id>.ts`.
import type { BlankLayer, Detail, InkLayer, LifeAnimation, PieceCategory, Primitive, ZoneLayer } from '../model';
import type { Color } from '../../../engine/types';

export function rect(x: number, y: number, w: number, h: number, r?: number): Primitive {
  return r === undefined ? { kind: 'rect', x, y, w, h } : { kind: 'rect', x, y, w, h, r };
}

export function circle(cx: number, cy: number, r: number): Primitive {
  return { kind: 'circle', cx, cy, r };
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): Primitive {
  return { kind: 'ellipse', cx, cy, rx, ry };
}

export function poly(...points: [number, number][]): Primitive {
  return { kind: 'polygon', points };
}

/** Forme libre : chemin SVG fermé (M L H V C S Q T Z, sans arc). */
export function path(d: string): Primitive {
  return { kind: 'path', d };
}

/** Étoile à `branches` pointes (rayon extérieur R, intérieur r), la première pointe en haut. */
export function star(cx: number, cy: number, R: number, r: number, branches = 5): Primitive {
  const points: [number, number][] = [];
  for (let i = 0; i < branches * 2; i += 1) {
    const radius = i % 2 === 0 ? R : r;
    const angle = (Math.PI / branches) * i - Math.PI / 2;
    points.push([round2(cx + radius * Math.cos(angle)), round2(cy + radius * Math.sin(angle))]);
  }
  return { kind: 'polygon', points };
}

/** `count` cercles de rayon `r` répartis à `distance` du centre (pétales d'une fleur). */
export function ring(cx: number, cy: number, distance: number, r: number, count = 5): Primitive[] {
  const shapes: Primitive[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    shapes.push(circle(round2(cx + distance * Math.cos(angle)), round2(cy + distance * Math.sin(angle)), r));
  }
  return shapes;
}

/** Chemin d'encre d'un petit rond (œil, poignée, grain de sable) : à passer à `ink`, souvent `filled`. */
export function dot(cx: number, cy: number, r: number): string {
  return `M${round2(cx - r)} ${cy} a${r} ${r} 0 1 0 ${round2(r * 2)} 0 a${r} ${r} 0 1 0 ${round2(-r * 2)} 0 Z`;
}

/** Chemin d'encre de `count` rayons autour d'un centre, du rayon `from` au rayon `to` (soleil). */
export function rays(cx: number, cy: number, from: number, to: number, count = 12): string {
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    d += `M${round2(cx + from * cos)} ${round2(cy + from * sin)} L${round2(cx + to * cos)} ${round2(cy + to * sin)} `;
  }
  return d.trim();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ZoneOptions {
  life?: LifeAnimation;
  piece?: true;
  pieceAs?: PieceCategory;
  pair?: string;
  differentFrom?: string[];
}

export function zone(
  id: string,
  shape: Primitive[],
  anchor: { x: number; y: number },
  detail: Detail,
  palette: Color[],
  options: ZoneOptions = {},
): ZoneLayer {
  return {
    kind: 'zone',
    id,
    shape,
    anchor,
    detail,
    palette,
    ...(options.life !== undefined ? { life: options.life } : {}),
    ...(options.piece !== undefined ? { piece: options.piece } : {}),
    ...(options.pieceAs !== undefined ? { pieceAs: options.pieceAs } : {}),
    ...(options.pair !== undefined ? { pair: options.pair } : {}),
    ...(options.differentFrom !== undefined ? { differentFrom: options.differentFrom } : {}),
  };
}

export interface BlankOptions {
  life?: LifeAnimation;
  piece?: true;
  endOnly?: true;
  thin?: true;
}

export function blank(shape: Primitive[], detail: Detail, options: BlankOptions = {}): BlankLayer {
  return {
    kind: 'blank',
    shape,
    detail,
    ...(options.life !== undefined ? { life: options.life } : {}),
    ...(options.piece !== undefined ? { piece: options.piece } : {}),
    ...(options.endOnly !== undefined ? { endOnly: options.endOnly } : {}),
    ...(options.thin !== undefined ? { thin: options.thin } : {}),
  };
}

export interface InkOptions {
  filled?: true;
  thin?: true;
  life?: LifeAnimation;
  endOnly?: true;
}

export function ink(d: string, detail: Detail, options: InkOptions = {}): InkLayer {
  return {
    kind: 'ink',
    d,
    detail,
    ...(options.filled !== undefined ? { filled: options.filled } : {}),
    ...(options.thin !== undefined ? { thin: options.thin } : {}),
    ...(options.life !== undefined ? { life: options.life } : {}),
    ...(options.endOnly !== undefined ? { endOnly: options.endOnly } : {}),
  };
}
