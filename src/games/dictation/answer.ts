// Comparaison des réponses de la dictée (docs/specs/DICTEE.md §3.2 et §3.5). Pur : aucune dépendance
// au DOM ni au stockage.

/** NFC ; apostrophes et tirets ramenés à leur forme droite ; minuscules ; espaces normalisés. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[’‘ʼ´]/g, "'")
    .replace(/[‐‑–]/g, '-')
    .toLocaleLowerCase('fr')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Compare deux réponses après normalisation : un accent compte. */
export function isCorrectAnswer(typed: string, expected: string): boolean {
  return normalizeAnswer(typed) === normalizeAnswer(expected);
}

export interface Mark {
  char: string;
  ok: boolean;
}

/**
 * Distance de Levenshtein entre `typed` et `expected` (chaque opération coûte 1, point de code par
 * point de code), puis remontée depuis la fin en préférant la diagonale (égalité ou substitution),
 * puis une lettre en trop dans `typed`, puis une lettre en plus dans `expected` (docs/specs/DICTEE.md §3.5).
 */
export function diffLetters(typed: string, expected: string): { typed: Mark[]; expected: Mark[] } {
  const t = Array.from(normalizeAnswer(typed));
  const e = Array.from(normalizeAnswer(expected));
  const n = t.length;
  const m = e.length;

  // dp[i][j] : distance d'édition entre t[0..i) et e[0..j).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= m; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = t[i - 1] === e[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j - 1]! + cost, dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1);
    }
  }

  const typedMarks: Mark[] = [];
  const expectedMarks: Mark[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const diagCost = i > 0 && j > 0 ? (t[i - 1] === e[j - 1] ? 0 : 1) : Number.POSITIVE_INFINITY;
    if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + diagCost) {
      const ok = t[i - 1] === e[j - 1];
      typedMarks.unshift({ char: t[i - 1]!, ok });
      expectedMarks.unshift({ char: e[j - 1]!, ok });
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      // Lettre en trop dans `typed`.
      typedMarks.unshift({ char: t[i - 1]!, ok: false });
      i -= 1;
    } else {
      // Lettre en plus dans `expected` (absente de `typed`).
      expectedMarks.unshift({ char: e[j - 1]!, ok: false });
      j -= 1;
    }
  }

  return { typed: typedMarks, expected: expectedMarks };
}
