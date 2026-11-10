// Contenu du programme de lecture : graphèmes, syllabes, mots, items par étape. LECTURE.md §3 et §4.
import { getPicture, PICTURES } from './pictures';
import type {
  Grapheme,
  GraphemeId,
  GraphemeKind,
  ItemId,
  PictureId,
  ReadingGameId,
  ReadingSkill,
  ReadingStage,
  ReadWord,
  Syllable,
} from './types';

// ---------- Graphèmes (§3.2) ----------

/** [id, majuscules, minuscules, étape, genre, mot repère]. L'ordre du tableau EST l'ordre d'introduction. */
const GRAPHEME_ROWS: readonly (readonly [string, string, string, ReadingStage, GraphemeKind, PictureId | null])[] = [
  ['a', 'A', 'a', 2, 'vowel', 'avion'],
  ['i', 'I', 'i', 2, 'vowel', 'ile'],
  ['o', 'O', 'o', 2, 'vowel', 'orange'],
  ['u', 'U', 'u', 2, 'vowel', 'usine'],
  ['é', 'É', 'é', 2, 'vowel', 'etoile'],
  ['l', 'L', 'l', 3, 'long', 'lune'],
  ['r', 'R', 'r', 3, 'long', 'robot'],
  ['f', 'F', 'f', 3, 'long', 'fusee'],
  ['m', 'M', 'm', 3, 'long', 'moto'],
  ['s', 'S', 's', 3, 'long', 'soleil'],
  ['e', 'E', 'e', 3, 'vowel', null],
  ['j', 'J', 'j', 3, 'long', 'jus'],
  ['v', 'V', 'v', 3, 'long', 'velo'],
  ['n', 'N', 'n', 3, 'long', 'nuage'],
  ['z', 'Z', 'z', 3, 'long', 'zebre'],
  ['ou', 'OU', 'ou', 3, 'digraph', 'ours'],
  ['ch', 'CH', 'ch', 3, 'digraph', 'chat'],
  ['p', 'P', 'p', 4, 'short', 'poule'],
  ['t', 'T', 't', 4, 'short', 'tortue'],
  ['b', 'B', 'b', 4, 'short', 'ballon'],
  ['d', 'D', 'd', 4, 'short', 'de'],
  ['c', 'C', 'c', 4, 'short', 'canard'],
  ['g', 'G', 'g', 4, 'short', 'gateau'],
  ['k', 'K', 'k', 5, 'rare', 'kiwi'],
  ['q', 'Q', 'q', 5, 'rare', null],
  ['h', 'H', 'h', 5, 'rare', 'hibou'],
  ['x', 'X', 'x', 5, 'rare', null],
  ['y', 'Y', 'y', 5, 'rare', 'yoyo'],
  ['w', 'W', 'w', 5, 'rare', null],
  ['on', 'ON', 'on', 5, 'bonus', null],
  ['oi', 'OI', 'oi', 5, 'bonus', null],
];

/** Tous les graphèmes, triés par `order`. */
export const GRAPHEMES: readonly Grapheme[] = GRAPHEME_ROWS.map(([id, upper, lower, stage, kind, keyword], i) => ({
  id,
  upper,
  lower,
  stage,
  order: i + 1,
  kind,
  gated: i + 1 <= 23,
  keyword,
}));

const GRAPHEME_BY_ID: ReadonlyMap<GraphemeId, Grapheme> = new Map(GRAPHEMES.map((g) => [g.id, g]));

export function getGrapheme(id: GraphemeId): Grapheme | undefined {
  return GRAPHEME_BY_ID.get(id);
}

// ---------- Syllabes (§3.3) ----------

/** Voyelles des syllabes de la machine, dans l'ordre. */
const SYLLABLE_VOWELS: readonly GraphemeId[] = ['a', 'i', 'o', 'u', 'é', 'ou'];
/** Consonnes de la machine : jamais q, h, x, y, w, k ; c et g seulement durs (a, o, u, ou). */
const SYLLABLE_ONSETS: readonly GraphemeId[] = ['l', 'r', 'f', 'm', 's', 'j', 'v', 'n', 'z', 'ch', 'p', 't', 'b', 'd', 'c', 'g'];

/** Image d'un mot qui commence (à l'oral) par la syllabe : choisie à la main, jamais devinée. */
const SYLLABLE_PICTURE: Readonly<Record<string, PictureId>> = {
  la: 'lama', li: 'lit', lu: 'lune', lé: 'lezard', lou: 'loup',
  ra: 'rat', ri: 'riz', ro: 'robot', ré: 'reveil', rou: 'roue',
  fu: 'fusee', fé: 'fee',
  mi: 'micro', mo: 'moto', mou: 'mouton', mé: 'medaille',
  sa: 'sapin', si: 'sirene', so: 'soleil', su: 'sucette', sou: 'souris',
  ju: 'judo',
  va: 'vache', vé: 'velo',
  na: 'nageur', ni: 'nid', no: 'noel', nu: 'nuage', né: 'nez',
  cha: 'chapeau', cho: 'chocolat', chou: 'chou',
  pa: 'papillon', pi: 'pizza', po: 'pomme', pou: 'poule',
  ta: 'taxi', ti: 'tigre', to: 'tomate', tu: 'tulipe', té: 'telephone',
  ba: 'ballon', bi: 'biberon', bo: 'bol', bu: 'bus', bé: 'bebe', bou: 'bougie',
  di: 'dinosaure', dé: 'de', dou: 'doudou',
  ca: 'canard', co: 'cochon', cou: 'couteau',
  ga: 'gateau', go: 'gorille', gou: 'goutte',
};

function buildSyllables(): Syllable[] {
  const out: Syllable[] = [];
  for (const onset of SYLLABLE_ONSETS) {
    for (const vowel of SYLLABLE_VOWELS) {
      // c et g devant i, é (et e) : doux, hors programme.
      if ((onset === 'c' || onset === 'g') && (vowel === 'i' || vowel === 'é')) continue;
      const id = `${onset}${vowel}`;
      out.push({ id, onset, vowel, picture: SYLLABLE_PICTURE[id] ?? null });
    }
  }
  return out;
}

/** Syllabes consonne + voyelle de la machine à syllabes. */
export const SYLLABLES: readonly Syllable[] = buildSyllables();

// ---------- Mots à lire (§3.4) ----------

/** [texte en capitales, syllabes, image]. Déchiffrables avec les graphèmes n° 1 à 23, sans lettre muette. */
const WORD_ROWS: readonly (readonly [string, readonly string[], PictureId])[] = [
  ['MOTO', ['MO', 'TO'], 'moto'],
  ['LAMA', ['LA', 'MA'], 'lama'],
  ['VÉLO', ['VÉ', 'LO'], 'velo'],
  ['SOFA', ['SO', 'FA'], 'sofa'],
  ['BÉBÉ', ['BÉ', 'BÉ'], 'bebe'],
  ['JUDO', ['JU', 'DO'], 'judo'],
  ['CAFÉ', ['CA', 'FÉ'], 'cafe'],
  ['TÉLÉ', ['TÉ', 'LÉ'], 'tele'],
  ['COCO', ['CO', 'CO'], 'coco'],
  ['DOUDOU', ['DOU', 'DOU'], 'doudou'],
  ['PIANO', ['PI', 'A', 'NO'], 'piano'],
  ['RADIO', ['RA', 'DI', 'O'], 'radio'],
  ['CAMÉRA', ['CA', 'MÉ', 'RA'], 'camera'],
  ['DODO', ['DO', 'DO'], 'dodo'],
];

/** Mots déchiffrables de l'étape 5. `id` = le mot en minuscules sans accent. */
export const READ_WORDS: readonly ReadWord[] = WORD_ROWS.map(([text, syllables, picture]) => ({
  id: text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''),
  text,
  syllables,
  picture,
}));

/**
 * Découpe un mot (majuscules ou minuscules) en graphèmes du programme : « DOUDOU » → d, ou, d, ou.
 * Seuls les digraphes ou et ch sont reconnus (les mots à lire n'utilisent rien d'autre).
 */
export function splitGraphemes(text: string): GraphemeId[] {
  const s = text.toLowerCase();
  const out: GraphemeId[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const two = s.slice(i, i + 2);
    if (two === 'ou' || two === 'ch') {
      out.push(two);
      i += 1;
    } else {
      out.push(s[i] as string);
    }
  }
  return out;
}

// ---------- Items (§3.1) ----------

export function graphemeItem(id: GraphemeId): ItemId {
  return `g:${id}`;
}

export function skillItem(skill: ReadingSkill): ItemId {
  return `k:${skill}`;
}

const g = graphemeItem;
const k = skillItem;

const STAGE_ITEMS: Readonly<Record<ReadingStage, readonly ItemId[]>> = {
  1: [k('count'), k('onset'), k('rhyme')],
  2: [g('a'), g('i'), g('o'), g('u'), g('é')],
  3: [g('l'), g('r'), k('blend'), g('f'), g('m'), g('s'), g('e'), g('j'), g('v'), g('n'), g('z'), g('ou'), g('ch')],
  4: [g('p'), g('t'), k('blend-stop'), g('b'), g('d'), g('c'), g('g')],
  5: [k('read'), k('case'), g('k'), g('q'), g('h'), g('x'), g('y'), g('w'), g('on'), g('oi')],
};

/** Items de l'étape, dans l'ordre d'introduction (compétences comprises). */
export function stageItems(stage: ReadingStage): ItemId[] {
  return [...(STAGE_ITEMS[stage] ?? [])];
}

/** Parmi `stageItems`, ceux qui doivent être acquis pour passer à l'étape suivante. */
export function gatedItems(stage: ReadingStage): ItemId[] {
  if (stage === 5) return [k('read'), k('case')];
  return stageItems(stage);
}

/** Tous les items du programme, toutes étapes. */
export function allItems(): ItemId[] {
  return ([1, 2, 3, 4, 5] as const).flatMap((s) => stageItems(s));
}

// ---------- Jeux par item (§4) ----------

/** Nombre d'images dont le premier son est ce graphème, au-dessous duquel « par quoi ça commence » est exclu. */
export const MIN_FIRST_SOUND_PICTURES = 2;

const FIRST_SOUND_COUNT: ReadonlyMap<GraphemeId, number> = (() => {
  const m = new Map<GraphemeId, number>();
  for (const p of PICTURES) if (p.firstSound) m.set(p.firstSound, (m.get(p.firstSound) ?? 0) + 1);
  return m;
})();
function firstSoundCount(id: GraphemeId): number {
  return FIRST_SOUND_COUNT.get(id) ?? 0;
}

/** Jeux qui peuvent interroger cet item. La lettre muette « h » n'en a aucun ; sans images : « son » seulement. */
export function gamesForItem(item: ItemId): ReadingGameId[] {
  if (item.startsWith('k:')) {
    switch (item.slice(2)) {
      case 'count':
        return ['syllable-drum'];
      case 'onset':
        return ['same-start'];
      case 'rhyme':
        return ['same-end'];
      case 'blend':
      case 'blend-stop':
        return ['syllable-machine'];
      case 'read':
        return ['mystery-word'];
      case 'case':
        return ['letter-twins'];
      default:
        return [];
    }
  }
  const id = item.slice(2);
  if (!getGrapheme(id)) return [];
  if (id === 'h') return []; // muette : rien à faire chanter
  const games: ReadingGameId[] = ['letter-sound'];
  if (firstSoundCount(id) >= MIN_FIRST_SOUND_PICTURES) games.push('first-sound');
  return games;
}

/** Image d'un mot repère, ou undefined (utilitaire pour la présentation d'une lettre nouvelle). */
export function keywordPicture(id: GraphemeId) {
  const kw = getGrapheme(id)?.keyword;
  return kw ? getPicture(kw) : undefined;
}
