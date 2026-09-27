// Rendu des émojis de CONTENU via des SVG Noto embarqués (public/emoji/), pour un rendu strictement
// identique sur tous les appareils : sinon la police système diverge (Noto sur Android, Apple sur
// iPad, Segoe sur Windows…), voir docs/ARCHITECTURE.md. Les fichiers sont produits hors ligne par
// scripts/fetch-emoji.mjs (même convention de nommage, dupliquée ici et testée : voir emoji.test.ts).
// N'utiliser ce module que pour le contenu que l'enfant manipule/regarde (objets, avatars, décor) —
// jamais pour les pictos d'interface (dessinés en SVG par ailleurs, voir src/ui/icons/).

/** Nom de fichier Noto pour un émoji : `emoji_u` + codepoints hex minuscules séparés par `_`,
 * SANS le sélecteur de variation U+FE0F (ex. 🛏️ → `emoji_u1f6cf`, ⛸️ → `emoji_u26f8`). */
export function notoFileName(char: string): string {
  const codepoints = [...char]
    .map((c) => c.codePointAt(0) as number)
    .filter((cp) => cp !== 0xfe0f)
    .map((cp) => cp.toString(16));
  return `emoji_u${codepoints.join('_')}`;
}

/** URL publique du SVG d'un émoji de contenu, respectant le sous-chemin de déploiement (BASE_URL). */
export function emojiUrl(char: string): string {
  return `${import.meta.env.BASE_URL}emoji/${notoFileName(char)}.svg`;
}
