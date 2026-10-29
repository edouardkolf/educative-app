// Génération pure des manches « ranger du plus petit au plus grand ». Aucun DOM, aucun stockage.
import type { OrderParams, Rng, Round } from '../../engine/types';
import { OBJECTS, getObject } from '../../ui/objects';
import type { OrderItem, OrderRoundData } from './types';

/** La plus petite taille reste bien visible : au moins 40 % de la plus grande. */
export const MIN_SCALE = 40;
export const MAX_SCALE = 100;
const MAX_TRIES = 40;

/** Plus grand écart minimal réalisable avec ce nombre de tailles. */
export function maxFeasibleGap(items: number): number {
  return Math.floor((MAX_SCALE - MIN_SCALE) / (items - 1));
}

/** Tailles croissantes (en %) dont chaque écart consécutif vaut au moins `gap`. */
function drawScales(items: number, gap: number, rng: Rng): number[] {
  const slack = MAX_SCALE - MIN_SCALE - (items - 1) * gap;
  const extras = Array.from({ length: items }, () => rng.int(0, slack)).sort((a, b) => a - b);
  return extras.map((extra, k) => MIN_SCALE + k * gap + extra);
}

function drawValues(items: number, min: number, max: number, rng: Rng): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return rng.shuffle(pool).slice(0, items).sort((a, b) => a - b);
}

/** Mélange jusqu'à ce que l'ordre présenté ne soit pas l'ordre croissant. */
function shuffleUnsorted(sorted: OrderItem[], rng: Rng): OrderItem[] {
  let shuffled = rng.shuffle(sorted);
  for (let i = 0; i < MAX_TRIES && shuffled.every((it, k) => it === sorted[k]); i += 1) {
    shuffled = rng.shuffle(sorted);
  }
  if (shuffled.every((it, k) => it === sorted[k])) shuffled = [...sorted].reverse();
  return shuffled;
}

export function generateRounds(params: OrderParams, count: number, rng: Rng): Round<OrderRoundData>[] {
  const rounds: Round<OrderRoundData>[] = [];
  const seen = new Set<string>();
  const emojis = (params.objects ?? [])
    .map((id) => getObject(id)?.emoji)
    .filter((e): e is string => e !== undefined);
  const fallbackEmojis = OBJECTS.map((o) => o.emoji);
  let lastEmoji = '';

  for (let r = 0; r < count; r += 1) {
    let round: Round<OrderRoundData> | undefined;
    for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
      let sorted: OrderItem[];
      let emoji: string | undefined;
      if (params.mode === 'size') {
        const pool = emojis.length > 0 ? emojis : fallbackEmojis;
        const fresh = pool.filter((e) => e !== lastEmoji);
        emoji = rng.pick(fresh.length > 0 ? fresh : pool);
        const gap = params.minGap ?? 20;
        sorted = drawScales(params.items, gap, rng).map((scale, k) => ({ id: String(k + 1), scale }));
      } else {
        const range = params.range ?? { min: 1, max: 9 };
        sorted = drawValues(params.items, range.min, range.max, rng).map((count) => ({ id: String(count), count }));
      }
      const answer = sorted.map((it) => it.id).join('-');
      const key = `${emoji ?? ''}|${sorted.map((it) => it.scale ?? it.count).join(',')}`;
      round = {
        data: { mode: params.mode, emoji, items: shuffleUnsorted(sorted, rng) },
        answer,
      };
      // Dernier essai accepté même si la manche existe déjà (paramètres trop étroits pour varier).
      if (!seen.has(key) || attempt === MAX_TRIES - 1) {
        seen.add(key);
        break;
      }
    }
    const done = round as Round<OrderRoundData>;
    lastEmoji = done.data.emoji ?? '';
    rounds.push(done);
  }
  return rounds;
}
