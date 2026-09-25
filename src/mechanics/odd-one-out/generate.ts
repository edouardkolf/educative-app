// Génération pure des manches de la mécanique « trouver l'intrus ». Aucun DOM, aucun stockage.
import type {
  ChoiceId,
  Color,
  ObjectCategory,
  ObjectId,
  OddOneOutParams,
  Rng,
  Round,
  Shape,
  Token,
} from '../../engine/types';
import { COLORS, OBJECT_CATEGORIES, SHAPES } from '../../engine/types';
import { OBJECTS } from '../../ui/objects';
import type { OddOneOutItem, OddOneOutRoundData } from './types';

const MAX_RETRIES_DIFFERENT_ROUND = 8;

// Repli produit quand la dimension « autre » n'a pas de réservoir dans les params.
const FALLBACK_SHAPES: readonly Shape[] = ['circle'];
const FALLBACK_COLORS: readonly Color[] = ['blue'];

function itemId(index: number): ChoiceId {
  return `item-${index}`;
}

function nonEmpty<T>(pool: readonly T[] | undefined, fallback: readonly T[]): readonly T[] {
  return pool && pool.length > 0 ? pool : fallback;
}

function distinct<T>(pool: readonly T[]): T[] {
  return [...new Set(pool)];
}

function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}

/** Une valeur commune (les normaux) + une valeur distincte (l'intrus), si le réservoir le permet. */
function pickPrimaryPair<T>(pool: readonly T[], rng: Rng): { common: T; odd: T } {
  const options = distinct(pool);
  if (options.length < 2) {
    const common = options[0] as T;
    return { common, odd: common }; // réservoir insuffisant : on dégrade sans planter
  }
  const [common, odd] = rng.shuffle(options);
  return { common: common as T, odd: odd as T };
}

/** distract=false : une seule valeur, partagée par tous (normaux ET intrus). */
function commonSecondary<T>(pool: readonly T[], rng: Rng): T {
  return rng.pick(pool);
}

/** distract=true : une valeur par normal, aussi variée que le réservoir le permet. */
function variedSecondary<T>(pool: readonly T[], count: number, rng: Rng): T[] {
  const shuffled = rng.shuffle(pool);
  return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length] as T);
}

/** Place les valeurs (normaux + intrus) sur les `total` positions, l'intrus à `oddIndex`. */
function placeItems<V>(
  total: number,
  oddIndex: number,
  normalValues: readonly V[],
  oddValue: V,
  toItem: (id: ChoiceId, value: V) => OddOneOutItem,
): OddOneOutItem[] {
  const items: OddOneOutItem[] = [];
  let cursor = 0;
  for (let i = 0; i < total; i += 1) {
    const id = itemId(i);
    items.push(i === oddIndex ? toItem(id, oddValue) : toItem(id, normalValues[cursor] as V));
    if (i !== oddIndex) cursor += 1;
  }
  return items;
}

interface TokenPlan {
  normalTokens: Token[];
  oddToken: Token;
}

/** differBy "color" ou "shape" : construit les jetons, symétriquement (dimension demandée + « autre »). */
function buildTokenPlan(params: OddOneOutParams, differBy: 'color' | 'shape', normalCount: number, rng: Rng): TokenPlan {
  const primaryPool = differBy === 'color' ? nonEmpty(params.colors, COLORS) : nonEmpty(params.shapes, SHAPES);
  const secondaryPool =
    differBy === 'color' ? nonEmpty(params.shapes, FALLBACK_SHAPES) : nonEmpty(params.colors, FALLBACK_COLORS);

  const { common: primaryCommon, odd: primaryOdd } = pickPrimaryPair(primaryPool, rng);

  let secondaryNormals: (Color | Shape)[];
  let secondaryOdd: Color | Shape;
  if (params.distract) {
    secondaryNormals = variedSecondary(secondaryPool, normalCount, rng);
    secondaryOdd = rng.pick(secondaryNormals); // partagée avec au moins un normal : ne trahit pas l'intrus
  } else {
    const shared = commonSecondary(secondaryPool, rng);
    secondaryNormals = repeat(shared, normalCount);
    secondaryOdd = shared;
  }

  const toToken = (primary: Color | Shape, secondary: Color | Shape): Token =>
    differBy === 'color'
      ? { shape: secondary as Shape, color: primary as Color }
      : { shape: primary as Shape, color: secondary as Color };

  return {
    normalTokens: secondaryNormals.map((secondary) => toToken(primaryCommon, secondary)),
    oddToken: toToken(primaryOdd, secondaryOdd),
  };
}

interface ObjectPlan {
  normalObjectIds: ObjectId[];
  oddObjectId: ObjectId;
}

/** differBy "category" : objets illustrés du catalogue `src/ui/objects.ts`. */
function buildObjectPlan(params: OddOneOutParams, normalCount: number, rng: Rng): ObjectPlan {
  const categoryPool = nonEmpty(params.categories, OBJECT_CATEGORIES);
  const { common: commonCategory, odd: oddCategory } = pickPrimaryPair(categoryPool, rng);

  const objectsOf = (category: ObjectCategory) => {
    const list = OBJECTS.filter((o) => o.category === category);
    return list.length > 0 ? list : OBJECTS; // catégorie vide (ne devrait pas arriver) : repli sur tout le catalogue
  };

  const normalsSource = objectsOf(commonCategory);
  const oddSource = objectsOf(oddCategory);

  let normalObjectIds: ObjectId[];
  if (params.distract) {
    const shuffled = rng.shuffle(normalsSource).map((o) => o.id);
    normalObjectIds = Array.from({ length: normalCount }, (_, i) => shuffled[i % shuffled.length] as ObjectId);
  } else {
    normalObjectIds = repeat(rng.pick(normalsSource).id, normalCount);
  }

  return { normalObjectIds, oddObjectId: rng.pick(oddSource).id };
}

function buildOneRound(params: OddOneOutParams, rng: Rng): Round<OddOneOutRoundData> {
  const total = params.items;
  const normalCount = total - 1;
  const oddIndex = rng.int(0, total - 1);

  let items: OddOneOutItem[];
  if (params.differBy === 'category') {
    const { normalObjectIds, oddObjectId } = buildObjectPlan(params, normalCount, rng);
    items = placeItems(total, oddIndex, normalObjectIds, oddObjectId, (id, objectId) => ({ id, kind: 'object', objectId }));
  } else {
    const differBy = params.differBy; // narrowé : 'color' | 'shape'
    const { normalTokens, oddToken } = buildTokenPlan(params, differBy, normalCount, rng);
    items = placeItems(total, oddIndex, normalTokens, oddToken, (id, token) => ({ id, kind: 'token', token }));
  }

  return { data: { items }, answer: itemId(oddIndex) };
}

function roundSignature(data: OddOneOutRoundData): string {
  return JSON.stringify(data.items.map((it) => (it.kind === 'token' ? `${it.token.shape}-${it.token.color}` : it.objectId)));
}

/** Génère `count` manches ; deux manches consécutives ne sont (quasi) jamais identiques. */
export function generateRounds(params: OddOneOutParams, count: number, rng: Rng): Round<OddOneOutRoundData>[] {
  const rounds: Round<OddOneOutRoundData>[] = [];
  let previousSignature: string | null = null;

  for (let i = 0; i < count; i += 1) {
    let round = buildOneRound(params, rng);
    let signature = roundSignature(round.data);
    let attempts = 0;
    while (signature === previousSignature && attempts < MAX_RETRIES_DIFFERENT_ROUND) {
      round = buildOneRound(params, rng);
      signature = roundSignature(round.data);
      attempts += 1;
    }
    rounds.push(round);
    previousSignature = signature;
  }

  return rounds;
}
