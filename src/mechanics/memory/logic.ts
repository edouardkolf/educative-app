// Logique pure du memory : table de cartes, retournements, essais ratés. La vue garde une table et la
// fait évoluer ; les minuteries (aperçu, recachage) restent côté vue.

export interface MemoryTable {
  cards: readonly string[];
  /** Cartes retournées et pas encore trouvées (0, 1 ou 2). À 2 : paire différente en attente de recachage. */
  flipped: number[];
  found: boolean[];
  misses: number;
  maxMisses: number;
  missSignaled: boolean;
}

export type FlipOutcome = 'first' | 'match' | 'mismatch' | 'ignored';

export function createTable(cards: readonly string[], maxMisses: number): MemoryTable {
  return { cards, flipped: [], found: cards.map(() => false), misses: 0, maxMisses, missSignaled: false };
}

export function flip(table: MemoryTable, index: number): FlipOutcome {
  if (index < 0 || index >= table.cards.length) return 'ignored';
  if (table.found[index] || table.flipped.includes(index) || table.flipped.length >= 2) return 'ignored';
  table.flipped.push(index);
  if (table.flipped.length === 1) return 'first';
  const [a, b] = table.flipped as [number, number];
  if (table.cards[a] === table.cards[b]) {
    table.found[a] = true;
    table.found[b] = true;
    table.flipped = [];
    return 'match';
  }
  table.misses += 1;
  return 'mismatch';
}

/** Recache la paire différente en attente. */
export function hideMismatch(table: MemoryTable): void {
  if (table.flipped.length === 2) table.flipped = [];
}

/** Vrai UNE fois : au premier dépassement de `maxMisses`. */
export function takeMissSignal(table: MemoryTable): boolean {
  if (table.missSignaled || table.misses <= table.maxMisses) return false;
  table.missSignaled = true;
  return true;
}

export function isCleared(table: MemoryTable): boolean {
  return table.found.every(Boolean);
}

export function isFaceUp(table: MemoryTable, index: number): boolean {
  return table.found[index] === true || table.flipped.includes(index);
}

/** Colonnes × rangées de la grille, pensées pour un écran en portrait. */
export function gridFor(count: number): { cols: number; rows: number } {
  const cols = count <= 10 ? 2 : count <= 12 ? 3 : 4;
  return { cols, rows: Math.ceil(count / cols) };
}
