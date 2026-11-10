// Intégrité du contenu du programme de lecture (LECTURE.md §3 et §12). Pris par `npm run validate:content`.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { notoFileName } from '../../ui/emoji';
import {
  GRAPHEMES,
  READ_WORDS,
  SYLLABLES,
  allItems,
  gamesForItem,
  gatedItems,
  getGrapheme,
  splitGraphemes,
  stageItems,
} from './curriculum';
import { PICTURES, getPicture, isDrumAmbiguous, onsetKey, picturesStartingWith } from './pictures';
import { READING_STAGES } from './types';

const ROOT = path.resolve(__dirname, '../../..');
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

describe('images', () => {
  it('ids, mots et émojis sont uniques', () => {
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length);
    expect(new Set(PICTURES.map((p) => p.word)).size).toBe(PICTURES.length);
    expect(new Set(PICTURES.map((p) => p.emoji)).size).toBe(PICTURES.length);
  });

  it('chaque émoji a son SVG embarqué', () => {
    const missing = PICTURES.filter((p) => !existsSync(path.join(ROOT, 'public', 'emoji', `${notoFileName(p.emoji)}.svg`)));
    expect(missing.map((p) => p.word)).toEqual([]);
  });

  it('les syllabes orales redonnent le mot écrit, chacune avec une voyelle, 1 à 3', () => {
    for (const p of PICTURES) {
      expect(p.syllables.join(''), p.word).toBe(p.word);
      expect(p.syllables.length, p.word).toBeGreaterThanOrEqual(1);
      expect(p.syllables.length, p.word).toBeLessThanOrEqual(3);
      for (const s of p.syllables) expect(/[aeiouyéèêâîôûœë]/.test(s), `${p.word} : « ${s} » sans voyelle`).toBe(true);
    }
  });

  it('exemples de la spec : banane = 2, chat = 1, éléphant = 3', () => {
    expect(getPicture('banane')?.syllables).toEqual(['ba', 'nane']);
    expect(getPicture('chat')?.syllables).toEqual(['chat']);
    expect(getPicture('elephant')?.syllables).toHaveLength(3);
  });

  it('au moins 12 mots par nombre de syllabes, dont 8 sans ambiguïté pour le tambour', () => {
    for (const n of [1, 2, 3]) {
      const ofN = PICTURES.filter((p) => p.syllables.length === n);
      expect(ofN.length, `${n} syllabe(s)`).toBeGreaterThanOrEqual(12);
      expect(ofN.filter((p) => !isDrumAmbiguous(p)).length, `${n} syllabe(s) sûres`).toBeGreaterThanOrEqual(8);
    }
  });

  it('un mot à e muet final n\'est jamais interrogé au tambour', () => {
    for (const w of ['banane', 'lune', 'poule', 'lunettes', 'assiette', 'île']) {
      const p = PICTURES.find((x) => x.word === w);
      expect(p && isDrumAmbiguous(p), w).toBe(true);
    }
    for (const w of ['chat', 'éléphant', 'lapin', 'moto']) {
      const p = PICTURES.find((x) => x.word === w);
      expect(p && isDrumAmbiguous(p), w).toBe(false);
    }
  });

  it('au moins 6 familles « commence pareil » (même première syllabe orale)', () => {
    const fam = new Map<string, number>();
    for (const p of PICTURES) fam.set(p.syllables[0] as string, (fam.get(p.syllables[0] as string) ?? 0) + 1);
    expect([...fam.values()].filter((n) => n >= 2).length).toBeGreaterThanOrEqual(6);
  });

  it('au moins 6 familles de rime, et la rime colle à l\'écriture', () => {
    const fam = new Map<string, string[]>();
    for (const p of PICTURES) fam.set(p.rhyme, [...(fam.get(p.rhyme) ?? []), p.word]);
    expect([...fam.values()].filter((w) => w.length >= 2).length).toBeGreaterThanOrEqual(6);
    // Terminaisons écrites autorisées par clé de rime : attrape une rime mal rangée.
    const endings: Record<string, RegExp> = {
      o: /(eau|o|ot)$/, a: /(a|at|as)$/, é: /(é|ée|ied|ez|é)$/, ou: /(ou|oup|oue|ou)$/, on: /(on|ion)$/,
      in: /(in|ain|ien|ouin|phin)$/, i: /(is|i|it|iz|ie|id|ie)$/, èn: /(eine|aine|ène)$/, ey: /(eil|eille)$/,
      ar: /(ard|are)$/, aj: /(age)$/, èt: /(ette|ettes)$/, eur: /(eur|œur)$/, oar: /(oire|oir)$/, an: /(ant|ent|can)$/,
      oi: /(oigt|ois|oie)$/, ouch: /(ouche)$/, èz: /(aise)$/, at: /(ate)$/, è: /(ai|et|ait)$/, el: /(elle|el|ël)$/,
      ij: /(ille)$/, uy: /(ouille)$/, ane: /(ane)$/, us: /(us)$/, ol: /(ol|ole)$/, ui: /(uie|uit)$/, u: /(us|ue)$/,
      yr: /(ure)$/,
    };
    for (const p of PICTURES) {
      const re = endings[p.rhyme];
      if (re) expect(re.test(p.word), `${p.word} range sous la rime « ${p.rhyme} »`).toBe(true);
    }
  });

  it('le premier son est le bon à l\'écrit (pas de « ch » sous s, ni de « ou/on/oi » sous o, ni de « an/ai/au » sous a)', () => {
    for (const p of PICTURES) {
      if (p.firstSound === null) continue;
      const w = strip(p.word);
      const g = p.firstSound;
      expect(w.startsWith(strip(g)), `${p.word} sous ${g}`).toBe(true);
      const next = w[g.length] ?? '';
      if (g === 's') expect(/[aeiouy]/.test(next), p.word).toBe(true);
      if (g === 'c') expect(/[aoulr]/.test(next), `${p.word} : c doux ou ch`).toBe(true);
      if (g === 'g') expect(/[aoulr]/.test(next), `${p.word} : g doux`).toBe(true);
      if (g === 'o') expect(/[^uni]/.test(next), `${p.word} : ou/on/oi sous o`).toBe(true);
      if (g === 'a') expect(/^(?!n[^aeiouy]|m[^aeiouy]|i|u)/.test(w.slice(1)), `${p.word} : an/ai/au sous a`).toBe(true);
      if (g === 'p' || g === 't') expect(next, p.word).not.toBe('h');
      if (g === 'ch') expect(w.startsWith('ch')).toBe(true);
    }
  });

  it('au moins 3 images par graphème des étapes 2 à 4, sauf exceptions de la langue', () => {
    const few: Record<string, number> = { e: 0, i: 2, u: 1, ou: 1, z: 2 };
    for (const g of GRAPHEMES.filter((x) => x.stage >= 2 && x.stage <= 4)) {
      const n = picturesStartingWith(g.id).length;
      expect(n, `images pour ${g.id}`).toBeGreaterThanOrEqual(few[g.id] ?? 3);
    }
  });

  it('les premiers sons de c/k/q sont regroupés, h est muet', () => {
    const canard = getPicture('canard');
    const kiwi = getPicture('kiwi');
    const hibou = getPicture('hibou');
    const ile = getPicture('ile');
    expect(canard && kiwi && onsetKey(canard) === onsetKey(kiwi)).toBe(true);
    expect(hibou && ile && onsetKey(hibou) === onsetKey(ile)).toBe(true);
  });
});

describe('graphèmes', () => {
  it('31 graphèmes, order 1..31 uniques, triés', () => {
    expect(GRAPHEMES.map((g) => g.order)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(new Set(GRAPHEMES.map((g) => g.id)).size).toBe(31);
  });

  it('les 26 lettres de l\'alphabet (et é) sont présentes', () => {
    for (const c of 'abcdefghijklmnopqrstuvwxyz') expect(getGrapheme(c), c).toBeDefined();
    expect(getGrapheme('é')).toBeDefined();
  });

  it('étape, genre et gated conformes au tableau §3.2', () => {
    const byOrder = (n: number) => GRAPHEMES[n - 1];
    expect(GRAPHEMES.slice(0, 5).map((g) => g.id)).toEqual(['a', 'i', 'o', 'u', 'é']);
    expect(GRAPHEMES.slice(5, 17).map((g) => g.id)).toEqual(['l', 'r', 'f', 'm', 's', 'e', 'j', 'v', 'n', 'z', 'ou', 'ch']);
    expect(GRAPHEMES.slice(17, 23).map((g) => g.id)).toEqual(['p', 't', 'b', 'd', 'c', 'g']);
    expect(GRAPHEMES.slice(23).map((g) => g.id)).toEqual(['k', 'q', 'h', 'x', 'y', 'w', 'on', 'oi']);
    for (let n = 1; n <= 31; n += 1) {
      const g = byOrder(n);
      expect(g?.gated, `gated ${g?.id}`).toBe(n <= 23);
      expect(g?.stage).toBe(n <= 5 ? 2 : n <= 17 ? 3 : n <= 23 ? 4 : 5);
    }
    expect(getGrapheme('l')?.kind).toBe('long');
    expect(getGrapheme('p')?.kind).toBe('short');
    expect(getGrapheme('ou')?.kind).toBe('digraph');
    expect(getGrapheme('e')?.kind).toBe('vowel');
    expect(getGrapheme('k')?.kind).toBe('rare');
    expect(getGrapheme('on')?.kind).toBe('bonus');
    expect(getGrapheme('ch')?.upper).toBe('CH');
  });

  it('le mot repère existe, commence par le graphème et a ce premier son', () => {
    for (const g of GRAPHEMES) {
      if (!g.keyword) continue;
      const p = getPicture(g.keyword);
      expect(p, `repère de ${g.id}`).toBeDefined();
      if (g.id !== 'h' && g.id !== 'y') expect(p?.firstSound, `repère de ${g.id}`).toBe(g.id);
    }
    expect(getGrapheme('e')?.keyword).toBeNull();
    expect(getGrapheme('m')?.keyword).toBe('moto');
  });
});

describe('syllabes', () => {
  it('conformes au §3.3 : pas de c/g doux, pas de e, q, h, x, y, w, k', () => {
    const forbidden = new Set(['e', 'q', 'h', 'x', 'y', 'w', 'k', 'on', 'oi']);
    for (const s of SYLLABLES) {
      expect(s.id).toBe(s.onset + s.vowel);
      expect(forbidden.has(s.onset) || forbidden.has(s.vowel), s.id).toBe(false);
      if (s.onset === 'c' || s.onset === 'g') expect(['i', 'é'].includes(s.vowel), s.id).toBe(false);
      expect(['a', 'i', 'o', 'u', 'é', 'ou']).toContain(s.vowel);
    }
    expect(new Set(SYLLABLES.map((s) => s.id)).size).toBe(SYLLABLES.length);
    const ids = new Set(SYLLABLES.map((s) => s.id));
    for (const id of ['la', 'mi', 'chou', 'ca', 'cou', 'gu', 'vé']) expect(ids.has(id), id).toBe(true);
    for (const id of ['ci', 'cé', 'gi', 'gé', 'le', 'ka', 'ha']) expect(ids.has(id), id).toBe(false);
  });

  it('l\'image d\'une syllabe commence par cette syllabe (LA comme LAMA)', () => {
    for (const s of SYLLABLES) {
      if (!s.picture) continue;
      const p = getPicture(s.picture);
      expect(p, s.id).toBeDefined();
      expect(strip(p?.word ?? '').startsWith(s.id.normalize('NFD').replace(/[̀-ͯ]/g, '')), `${s.id} / ${p?.word}`).toBe(true);
    }
    expect(SYLLABLES.find((s) => s.id === 'la')?.picture).toBe('lama');
    expect(SYLLABLES.find((s) => s.id === 'mo')?.picture).toBe('moto');
    expect(SYLLABLES.find((s) => s.id === 'vé')?.picture).toBe('velo');
  });

  it('les consonnes longues de k:blend couvrent au moins 6 consonnes', () => {
    const longOnsets = new Set(SYLLABLES.filter((s) => getGrapheme(s.onset)?.kind === 'long').map((s) => s.onset));
    expect(longOnsets.size).toBeGreaterThanOrEqual(6);
  });
});

describe('mots à lire', () => {
  it('au moins 14 mots, uniques, images existantes', () => {
    expect(READ_WORDS.length).toBeGreaterThanOrEqual(14);
    expect(new Set(READ_WORDS.map((w) => w.id)).size).toBe(READ_WORDS.length);
    expect(new Set(READ_WORDS.map((w) => w.picture)).size).toBe(READ_WORDS.length);
    for (const w of READ_WORDS) expect(getPicture(w.picture), w.text).toBeDefined();
  });

  it('entièrement déchiffrables avec les graphèmes 1 à 23, sans lettre muette ni double consonne', () => {
    for (const w of READ_WORDS) {
      for (const id of splitGraphemes(w.text)) {
        const g = getGrapheme(id);
        expect(g, `${w.text} : « ${id} » hors programme`).toBeDefined();
        expect(g?.gated, `${w.text} : « ${id} » n'est pas dans les 23 premiers`).toBe(true);
      }
      expect(/(.)\1/i.test(w.text.replace(/OU/g, 'x')) && !/^(BÉBÉ)$/.test(w.text) ? 'double' : 'ok', w.text).toBe('ok');
      expect(w.text, w.text).toBe(w.text.toUpperCase());
      expect(w.syllables.join(''), w.text).toBe(w.text);
      expect(w.syllables.length).toBeGreaterThanOrEqual(2);
      expect(w.syllables.length).toBeLessThanOrEqual(3);
      expect(w.text.endsWith('E') || w.text.endsWith('S') || w.text.endsWith('T') || w.text.endsWith('X')).toBe(false);
    }
  });

  it('l\'image du mot est un mot du catalogue qui s\'écrit pareil', () => {
    for (const w of READ_WORDS) {
      const p = getPicture(w.picture);
      expect(strip(p?.word ?? ''), w.text).toBe(w.id);
    }
  });
});

describe('items', () => {
  it('stageItems conforme au tableau §3.1', () => {
    expect(stageItems(1)).toEqual(['k:count', 'k:onset', 'k:rhyme']);
    expect(stageItems(2)).toEqual(['g:a', 'g:i', 'g:o', 'g:u', 'g:é']);
    expect(stageItems(3)).toEqual(['g:l', 'g:r', 'k:blend', 'g:f', 'g:m', 'g:s', 'g:e', 'g:j', 'g:v', 'g:n', 'g:z', 'g:ou', 'g:ch']);
    expect(stageItems(4)).toEqual(['g:p', 'g:t', 'k:blend-stop', 'g:b', 'g:d', 'g:c', 'g:g']);
    expect(stageItems(5)).toEqual(['k:read', 'k:case', 'g:k', 'g:q', 'g:h', 'g:x', 'g:y', 'g:w', 'g:on', 'g:oi']);
  });

  it('gatedItems : tous les items des étapes 1 à 4, k:read et k:case à l\'étape 5', () => {
    for (const s of [1, 2, 3, 4] as const) expect(gatedItems(s)).toEqual(stageItems(s));
    expect(gatedItems(5)).toEqual(['k:read', 'k:case']);
  });

  it('allItems : 38 items distincts', () => {
    const all = allItems();
    expect(all).toHaveLength(38);
    expect(new Set(all).size).toBe(38);
    expect(READING_STAGES.flatMap((s) => stageItems(s))).toEqual(all);
  });

  it('gamesForItem conforme au §4 et au §11', () => {
    expect(gamesForItem('k:count')).toEqual(['syllable-drum']);
    expect(gamesForItem('k:onset')).toEqual(['same-start']);
    expect(gamesForItem('k:rhyme')).toEqual(['same-end']);
    expect(gamesForItem('k:blend')).toEqual(['syllable-machine']);
    expect(gamesForItem('k:blend-stop')).toEqual(['syllable-machine']);
    expect(gamesForItem('k:read')).toEqual(['mystery-word']);
    expect(gamesForItem('k:case')).toEqual(['letter-twins']);
    expect(gamesForItem('g:m')).toEqual(['letter-sound', 'first-sound']);
    // sans (assez d')images : le son seulement
    expect(gamesForItem('g:e')).toEqual(['letter-sound']);
    expect(gamesForItem('g:u')).toEqual(['letter-sound']);
    expect(gamesForItem('g:ou')).toEqual(['letter-sound']);
  });

  it('tout item gated a au moins un jeu', () => {
    for (const s of READING_STAGES) for (const i of gatedItems(s)) expect(gamesForItem(i).length, i).toBeGreaterThan(0);
  });
});
