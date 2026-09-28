// Aides de construction d'un dessin (docs/specs/COLORIAGE.md §4.4-4.5). Pures, sans état : elles ne
// font que fabriquer les objets du modèle (`model.ts`). Utilisées par chaque `catalog/<id>.ts`.
import type { BlankLayer, Detail, InkLayer, LifeAnimation, Primitive, ZoneLayer } from '../model';
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

export interface ZoneOptions {
  life?: LifeAnimation;
  piece?: true;
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
    ...(options.pair !== undefined ? { pair: options.pair } : {}),
    ...(options.differentFrom !== undefined ? { differentFrom: options.differentFrom } : {}),
  };
}

export interface BlankOptions {
  life?: LifeAnimation;
  piece?: true;
  endOnly?: true;
}

export function blank(shape: Primitive[], detail: Detail, options: BlankOptions = {}): BlankLayer {
  return {
    kind: 'blank',
    shape,
    detail,
    ...(options.life !== undefined ? { life: options.life } : {}),
    ...(options.piece !== undefined ? { piece: options.piece } : {}),
    ...(options.endOnly !== undefined ? { endOnly: options.endOnly } : {}),
  };
}

export interface InkOptions {
  filled?: true;
  life?: LifeAnimation;
  endOnly?: true;
}

export function ink(d: string, detail: Detail, options: InkOptions = {}): InkLayer {
  return {
    kind: 'ink',
    d,
    detail,
    ...(options.filled !== undefined ? { filled: options.filled } : {}),
    ...(options.life !== undefined ? { life: options.life } : {}),
    ...(options.endOnly !== undefined ? { endOnly: options.endOnly } : {}),
  };
}
