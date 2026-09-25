// Génération pure des manches de « sort » (le trieur magique). Aucun DOM, aucun stockage.
import type { ObjectId, Rng, Round, SortParams } from '../../engine/types';
import type { SortRoundData } from './types';

/**
 * Séquence de `count` identifiants de groupe, équilibrée (chaque groupe reçoit autant de manches
 * que possible) et sans jamais plus de deux manches consécutives sur le même groupe (sauf si le
 * nombre de groupes ne laisse pas d'autre choix, ce qui ne devrait pas arriver avec 2-3 groupes).
 */
function buildGroupSequence(groupIds: readonly string[], count: number, rng: Rng): string[] {
  const n = groupIds.length;
  const base = Math.floor(count / n);
  const remainder = count % n;
  // Répartit les manches supplémentaires (remainder) sur un ordre de groupes mélangé, pour ne pas
  // toujours avantager le premier groupe des paramètres.
  const bonusOrder = rng.shuffle(groupIds).slice(0, remainder);
  const bonusSet = new Set(bonusOrder);
  const remaining = new Map(groupIds.map((id) => [id, base + (bonusSet.has(id) ? 1 : 0)]));

  const sequence: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const lastTwoEqual = sequence.length >= 2 && sequence[sequence.length - 1] === sequence[sequence.length - 2];
    const forbidden = lastTwoEqual ? sequence[sequence.length - 1] : null;
    const candidates = groupIds.filter((id) => (remaining.get(id) ?? 0) > 0);
    const allowed = forbidden ? candidates.filter((id) => id !== forbidden) : candidates;
    const pool = allowed.length > 0 ? allowed : candidates; // repli : réservoir insuffisant, on force
    // Toujours piocher parmi le(s) groupe(s) qui a/ont le plus de manches restantes : évite
    // d'épuiser un groupe trop tôt et de forcer une série de 3+ en fin de séquence.
    const maxRemaining = Math.max(...pool.map((id) => remaining.get(id) ?? 0));
    const richest = pool.filter((id) => (remaining.get(id) ?? 0) === maxRemaining);
    const chosen = rng.pick(richest);
    sequence.push(chosen);
    remaining.set(chosen, (remaining.get(chosen) ?? 0) - 1);
  }
  return sequence;
}

/** Pioche sans répétition dans le réservoir d'un groupe tant qu'il n'est pas épuisé, puis remélange. */
function makeObjectPicker(objects: readonly ObjectId[], rng: Rng): () => ObjectId {
  let queue: ObjectId[] = [];
  return () => {
    if (queue.length === 0) queue = rng.shuffle(objects);
    return queue.shift() as ObjectId;
  };
}

export function generateRounds(params: SortParams, count: number, rng: Rng): Round<SortRoundData>[] {
  const baskets = params.groups.map((g) => ({ id: g.id, symbol: g.symbol }));
  const groupIds = params.groups.map((g) => g.id);
  const sequence = buildGroupSequence(groupIds, count, rng);

  const pickers = new Map(params.groups.map((g) => [g.id, makeObjectPicker(g.objects, rng)]));

  return sequence.map((groupId) => {
    const pick = pickers.get(groupId);
    const objectId = pick ? pick() : (params.groups[0]?.objects[0] as ObjectId); // repli inoffensif
    return { data: { objectId, baskets }, answer: groupId };
  });
}
