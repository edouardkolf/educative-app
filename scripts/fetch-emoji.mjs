#!/usr/bin/env node
// Télécharge les SVG Noto (style « 2D », plat) des émojis de CONTENU utilisés par l'app, pour un
// rendu strictement identique sur tous les appareils (Android, iOS, Windows…) — voir src/ui/emoji.ts.
// Usage : node scripts/fetch-emoji.mjs
// Aucune dépendance npm : fetch natif de Node ≥ 18, écrit directement dans public/emoji/.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'emoji');
const BASE_URL = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/2D/svg';

// Émojis de CONTENU (objets, avatars, décor) embarqués par l'app. Tenu à jour manuellement : si tu
// ajoutes un émoji de contenu quelque part dans src/, ajoute-le ici puis relance ce script.
// (Volontairement pas de scan automatique du code source : ce script n'a aucune dépendance npm et
// doit rester exécutable isolément, contenu et interface pouvant diverger avec le temps.)
export const CONTENT_EMOJIS = [
  // src/ui/objects.ts (catalogue des objets illustrés)
  '🍎', '🍌', '🍐', '🍓', '🍒', '🍇', '🐶', '🐱', '🐰', '🐟', '🐦', '🐞', '🐄', '🐷', '🐑', '🐔', '🐴',
  '🦀', '🐙', '🐳', '🐬', '🐠', '🦋', '🐝', '🦉', '🚗', '🚌', '🚲', '⛵', '🚂', '🚜', '⚽', '🧸', '🎈',
  '🪁', '🪀', '🥁', '🌻', '🌷', '🌵', '🌳', '🌲', '🍀',
  // src/ui/avatars.ts (profils enfants)
  '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐧', '🐨', '🐰', '🐻',
  // src/mechanics/read/catalog.ts (sujets et supports de « Lis et montre »)
  '🎩', '🍄', '🐤', '🎂', '🏰', '🐓', '⛸️', '🦆', '🛋️', '🛶', '🐌', '🐢', '🟫', '🪑', '📦', '🛏️',
  // src/mechanics/color-mix/ColorMixView.tsx (fruits révélés + bulles)
  '🫐', '🥕', '🫧',
  // content/levels/**/*.json → src/mechanics/sort/types.ts SortBasket.symbol (paniers du trieur magique)
  '☁️', '🌊',
  // src/screens/map/worlds.ts (icônes de monde + particules de la fête d'arrivée)
  '🍃', '🌼', '🍂', '🐚', '💧', '🏔️', '❄️', '🌸',
  // src/screens/LevelEnd.tsx (confettis)
  '🎉', '✨',
  // src/screens/LockScreen.tsx (lune, zzz)
  '🌙', '💤',
  // src/screens/LevelFailed.tsx (visage triste)
  '😢',
  // src/ui/TutorialHand.tsx (doigt qui tape)
  '👆',
  // src/screens/SagaMap.tsx (soleil de l'anneau de temps)
  '☀️',
  // ⭐ : utilisé comme émoji de contenu (confettis, particules montagne), en plus de son usage
  // texte inchangé dans StarRow (picto d'interface, non touché par ce module).
  '⭐',
];

/** Nom de fichier Noto pour un émoji : `emoji_u` + codepoints hex minuscules séparés par `_`,
 * SANS le sélecteur de variation U+FE0F (ex. 🛏️ → `emoji_u1f6cf`, ⛸️ → `emoji_u26f8`). */
export function notoFileName(char) {
  const codepoints = [...char]
    .map((c) => c.codePointAt(0))
    .filter((cp) => cp !== 0xfe0f) // sélecteur de variation : absent des noms de fichiers Noto
    .map((cp) => cp.toString(16));
  return `emoji_u${codepoints.join('_')}`;
}

/** Retire les commentaires XML et l'éventuel bloc <metadata> (poids inutile, rien de visuel). */
function stripComments(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim() + '\n';
}

async function fetchOne(char) {
  const name = notoFileName(char);
  const url = `${BASE_URL}/${name}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Échec du téléchargement de ${char} (${name}.svg) : HTTP ${res.status} — ${url}`);
  }
  const raw = await res.text();
  const optimized = stripComments(raw);
  await writeFile(path.join(OUT_DIR, `${name}.svg`), optimized, 'utf8');
  return { char, name, bytes: Buffer.byteLength(optimized, 'utf8') };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const unique = [...new Set(CONTENT_EMOJIS)];
  console.log(`Téléchargement de ${unique.length} émojis Noto dans ${OUT_DIR}…`);
  let totalBytes = 0;
  const failures = [];
  for (const char of unique) {
    try {
      const result = await fetchOne(char);
      totalBytes += result.bytes;
      console.log(`  ✓ ${char}  ${result.name}.svg  (${result.bytes} o)`);
    } catch (err) {
      failures.push(err);
      console.error(`  ✗ ${char}  ${err.message}`);
    }
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} émoji(s) manquant(s) sur ${unique.length}.`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nOK : ${unique.length} fichiers, ${(totalBytes / 1024).toFixed(1)} Ko au total.`);
}

// N'exécute que si lancé directement (permet d'importer notoFileName/CONTENT_EMOJIS depuis un test).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
