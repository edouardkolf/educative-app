// Garde-fou : chaque émoji de contenu affiché par l'app a son SVG embarqué dans public/emoji.
// Sans ce fichier, <Emoji> afficherait une image introuvable (alt vide) : une case vide pour l'enfant.
// Parcourt le code (hors commentaires) et le contenu des niveaux ; relancer scripts/fetch-emoji.mjs
// après avoir ajouté un émoji à sa liste si ce test échoue.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { notoFileName } from './emoji';

const ROOT = path.resolve(__dirname, '../..');
/** Pictos encore affichés en texte, volontairement sans SVG (écran rare « mécanique indisponible »). */
const TEXT_ONLY = new Set(['🚧']);
/** Une séquence émoji : pictogramme étendu, suivi éventuellement d'un sélecteur de variation. */
const EMOJI_RE = /\p{Extended_Pictographic}️?/gu;

function walk(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, exts);
    return exts.some((e) => name.endsWith(e)) && !name.includes('.test.') ? [full] : [];
  });
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function usedEmojis(): Map<string, string> {
  const found = new Map<string, string>();
  const files = [...walk(path.join(ROOT, 'src'), ['.ts', '.tsx']), ...walk(path.join(ROOT, 'content'), ['.json'])];
  for (const file of files) {
    // L'espace parent affiche quelques symboles typographiques (★, ✓) en texte : hors périmètre.
    if (file.includes(`${path.sep}parent${path.sep}`)) continue;
    const text = file.endsWith('.json') ? readFileSync(file, 'utf-8') : stripComments(readFileSync(file, 'utf-8'));
    for (const match of text.matchAll(EMOJI_RE)) {
      if (!found.has(match[0])) found.set(match[0], path.relative(ROOT, file));
    }
  }
  return found;
}

describe('émojis embarqués', () => {
  it('chaque émoji de contenu a son SVG dans public/emoji', () => {
    const used = usedEmojis();
    expect(used.size, 'le scan ne trouve presque aucun émoji : regex ou chemins cassés').toBeGreaterThan(40);
    const missing = [...used]
      .filter(([char]) => !TEXT_ONLY.has(char.replace('️', '')))
      .filter(([char]) => !existsSync(path.join(ROOT, 'public', 'emoji', `${notoFileName(char)}.svg`)))
      .map(([char, file]) => `${char} (${notoFileName(char)}.svg) utilisé dans ${file}`);
    expect(missing).toEqual([]);
  });
});
