// Catalogue d'images du programme de lecture (LECTURE.md §3.5). Chaque image est un émoji Noto embarqué
// (public/emoji/, produit par scripts/fetch-emoji.mjs, rendu par <Emoji>).
//
// LE CŒUR PÉDAGOGIQUE : les syllabes sont ORALES (celles qu'on tape au tambour), pas orthographiques.
// Le e final muet ne compte pas : « banane » = ba-nane (2), « lune » = lune (1), « chat » = 1,
// « éléphant » = 3. On coupe avant la consonne (« ba-llon », « pi-zza ») pour que deux mots qui
// commencent par la même syllabe orale aient la MÊME chaîne en tête (« cha-peau » / « cha-meau »).
// La concaténation des syllabes redonne toujours le mot écrit (contrôlé par content.test.ts).
//
// Colonnes : émoji, mot, article, syllabes (séparées par « . »), premier son, rime.
//   - premier son : le graphème du programme par lequel commence le mot À L'ORAL ET À L'ÉCRIT (« chien » → ch ;
//     « cerise » ne serait ni c ni s : absent). null quand le mot commence par une lettre muette (hibou), un
//     graphème hors programme ou ambigu (guitare, croissant).
//   - rime : clé du dernier son vocalique et de ce qui suit, à l'oral : « o » pour chapeau/bateau/vélo.
import type { GraphemeId, Picture, PictureId } from './types';

/** « un » / « une » sont gardés ; « du », « de la » (mots sans article indéfini naturel) deviennent null. */
type Article = 'un' | 'une' | 'du' | 'de la' | null;
type Row = readonly [emoji: string, word: string, article: Article, syllables: string, first: GraphemeId | null, rhyme: string];

/** Identifiant d'une image = le mot sans accent ni apostrophe (« écureuil » → « ecureuil »). */
function slug(word: string): PictureId {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

const ROWS: readonly Row[] = [
  // ---- voyelles ----
  ['✈️', 'avion', 'un', 'a.vion', 'a', 'on'],
  ['🍍', 'ananas', 'un', 'a.na.nas', 'a', 'a'],
  ['🥑', 'avocat', 'un', 'a.vo.cat', 'a', 'a'],
  ['🐝', 'abeille', 'une', 'a.beille', 'a', 'ey'],
  ['🕷️', 'araignée', 'une', 'a.rai.gnée', 'a', 'é'],
  ['🍽️', 'assiette', 'une', 'as.siette', 'a', 'èt'],
  ['🏝️', 'île', 'une', 'île', 'i', 'il'],
  ['🖼️', 'image', 'une', 'i.mage', 'i', 'aj'],
  ['🍊', 'orange', 'une', 'o.range', 'o', 'anj'],
  ['🫒', 'olive', 'une', 'o.live', 'o', 'iv'],
  ['🦴', 'os', 'un', 'os', 'o', 'os'],
  ['🌩️', 'orage', 'un', 'o.rage', 'o', 'aj'],
  ['👂', 'oreille', 'une', 'o.reille', 'o', 'ey'],
  ['🏭', 'usine', 'une', 'u.sine', 'u', 'in-e'],
  ['⭐', 'étoile', 'une', 'é.toile', 'é', 'oal'],
  ['🐘', 'éléphant', 'un', 'é.lé.phant', 'é', 'an'],
  ['🐿️', 'écureuil', 'un', 'é.cu.reuil', 'é', 'euy'],
  ['🏫', 'école', 'une', 'é.cole', 'é', 'ol'],
  ['🪜', 'échelle', 'une', 'é.chelle', 'é', 'el'],
  ['⚡', 'éclair', 'un', 'é.clair', 'é', 'èr'],
  // ---- consonnes qui durent ----
  ['🐰', 'lapin', 'un', 'la.pin', 'l', 'in'],
  ['🌙', 'lune', 'une', 'lune', 'l', 'un'],
  ['🦙', 'lama', 'un', 'la.ma', 'l', 'a'],
  ['🛏️', 'lit', 'un', 'lit', 'l', 'i'],
  ['🐺', 'loup', 'un', 'loup', 'l', 'ou'],
  ['🥛', 'lait', 'un', 'lait', 'l', 'è'],
  ['🦎', 'lézard', 'un', 'lé.zard', 'l', 'ar'],
  ['🐆', 'léopard', 'un', 'lé.o.pard', 'l', 'ar'],
  ['👓', 'lunettes', null, 'lu.nettes', 'l', 'èt'],
  ['🦁', 'lion', 'un', 'li.on', 'l', 'on'],
  ['🤖', 'robot', 'un', 'ro.bot', 'r', 'o'],
  ['🍇', 'raisin', 'un', 'rai.sin', 'r', 'in'],
  ['🦊', 'renard', 'un', 're.nard', 'r', 'ar'],
  ['🦈', 'requin', 'un', 're.quin', 'r', 'in'],
  ['🐀', 'rat', 'un', 'rat', 'r', 'a'],
  ['🍚', 'riz', 'du', 'riz', 'r', 'i'],
  ['⏰', 'réveil', 'un', 'ré.veil', 'r', 'ey'],
  ['🛞', 'roue', 'une', 'roue', 'r', 'ou'],
  ['👗', 'robe', 'une', 'robe', 'r', 'ob'],
  ['🏸', 'raquette', 'une', 'ra.quette', 'r', 'èt'],
  ['👸', 'reine', 'une', 'reine', 'r', 'èn'],
  ['🚀', 'fusée', 'une', 'fu.sée', 'f', 'é'],
  ['🐜', 'fourmi', 'une', 'four.mi', 'f', 'i'],
  ['🧀', 'fromage', 'un', 'fro.mage', 'f', 'aj'],
  ['🍴', 'fourchette', 'une', 'four.chette', 'f', 'èt'],
  ['🔥', 'feu', 'un', 'feu', 'f', 'eu'],
  ['🧚', 'fée', 'une', 'fée', 'f', 'é'],
  ['🌸', 'fleur', 'une', 'fleur', 'f', 'eur'],
  ['🍓', 'fraise', 'une', 'fraise', 'f', 'èz'],
  ['⛲', 'fontaine', 'une', 'fon.taine', 'f', 'èn'],
  ['🏍️', 'moto', 'une', 'mo.to', 'm', 'o'],
  ['🏠', 'maison', 'une', 'mai.son', 'm', 'on'],
  ['🐑', 'mouton', 'un', 'mou.ton', 'm', 'on'],
  ['🍈', 'melon', 'un', 'me.lon', 'm', 'on'],
  ['🔨', 'marteau', 'un', 'mar.teau', 'm', 'o'],
  ['🎤', 'micro', 'un', 'mi.cro', 'm', 'o'],
  ['✋', 'main', 'une', 'main', 'm', 'in'],
  ['🏔️', 'montagne', 'une', 'mon.tagne', 'm', 'agn'],
  ['🥇', 'médaille', 'une', 'mé.daille', 'm', 'ay'],
  ['🪰', 'mouche', 'une', 'mouche', 'm', 'ouch'],
  ['🪞', 'miroir', 'un', 'mi.roir', 'm', 'oar'],
  ['☀️', 'soleil', 'un', 'so.leil', 's', 'ey'],
  ['🐭', 'souris', 'une', 'sou.ris', 's', 'i'],
  ['🌲', 'sapin', 'un', 'sa.pin', 's', 'in'],
  ['🧼', 'savon', 'un', 'sa.von', 's', 'on'],
  ['🐍', 'serpent', 'un', 'ser.pent', 's', 'an'],
  ['🛋️', 'sofa', 'un', 'so.fa', 's', 'a'],
  ['🧜', 'sirène', 'une', 'si.rène', 's', 'èn'],
  ['🍭', 'sucette', 'une', 'su.cette', 's', 'èt'],
  ['🪣', 'seau', 'un', 'seau', 's', 'o'],
  ['🧂', 'sel', 'du', 'sel', 's', 'el'],
  ['🧃', 'jus', 'du', 'jus', 'j', 'u'],
  ['🥋', 'judo', 'du', 'ju.do', 'j', 'o'],
  ['📰', 'journal', 'un', 'jour.nal', 'j', 'al'],
  ['🤹', 'jongleur', 'un', 'jon.gleur', 'j', 'eur'],
  ['🚲', 'vélo', 'un', 'vé.lo', 'v', 'o'],
  ['🐄', 'vache', 'une', 'vache', 'v', 'ach'],
  ['🚗', 'voiture', 'une', 'voi.ture', 'v', 'yr'],
  ['🌋', 'volcan', 'un', 'vol.can', 'v', 'an'],
  ['🧳', 'valise', 'une', 'va.lise', 'v', 'iz'],
  ['🪱', 'ver', 'un', 'ver', 'v', 'èr'],
  ['🌬️', 'vent', 'du', 'vent', 'v', 'an'],
  ['☁️', 'nuage', 'un', 'nu.age', 'n', 'aj'],
  ['👃', 'nez', 'un', 'nez', 'n', 'é'],
  ['🌃', 'nuit', 'une', 'nuit', 'n', 'ui'],
  ['🎄', 'noël', null, 'no.ël', 'n', 'el'],
  ['🏊', 'nageur', 'un', 'na.geur', 'n', 'eur'],
  ['🪹', 'nid', 'un', 'nid', 'n', 'i'],
  ['🦓', 'zèbre', 'un', 'zèbre', 'z', 'èbr'],
  ['🧟', 'zombie', 'un', 'zom.bie', 'z', 'i'],
  ['🐻', 'ours', 'un', 'ours', 'ou', 'urs'],
  ['🐱', 'chat', 'un', 'chat', 'ch', 'a'],
  ['🐶', 'chien', 'un', 'chien', 'ch', 'in'],
  ['🎩', 'chapeau', 'un', 'cha.peau', 'ch', 'o'],
  ['🍫', 'chocolat', 'du', 'cho.co.lat', 'ch', 'a'],
  ['🥬', 'chou', 'un', 'chou', 'ch', 'ou'],
  ['🐴', 'cheval', 'un', 'che.val', 'ch', 'al'],
  ['🏰', 'château', 'un', 'châ.teau', 'ch', 'o'],
  ['🐫', 'chameau', 'un', 'cha.meau', 'ch', 'o'],
  ['🪑', 'chaise', 'une', 'chaise', 'ch', 'èz'],
  ['🧦', 'chaussette', 'une', 'chaus.sette', 'ch', 'èt'],
  ['🍄', 'champignon', 'un', 'cham.pi.gnon', 'ch', 'on'],
  ['🐛', 'chenille', 'une', 'che.nille', 'ch', 'ij'],
  // ---- consonnes brèves ----
  ['🐔', 'poule', 'une', 'poule', 'p', 'oul'],
  ['🍎', 'pomme', 'une', 'pomme', 'p', 'om'],
  ['🐟', 'poisson', 'un', 'pois.son', 'p', 'on'],
  ['🦋', 'papillon', 'un', 'pa.pi.llon', 'p', 'on'],
  ['🐧', 'pingouin', 'un', 'pin.gouin', 'p', 'in'],
  ['🦜', 'perroquet', 'un', 'pe.rro.quet', 'p', 'è'],
  ['🦶', 'pied', 'un', 'pied', 'p', 'é'],
  ['🍞', 'pain', 'du', 'pain', 'p', 'in'],
  ['🍐', 'poire', 'une', 'poire', 'p', 'oar'],
  ['🍕', 'pizza', 'une', 'pi.zza', 'p', 'a'],
  ['🥔', 'patate', 'une', 'pa.tate', 'p', 'at'],
  ['☂️', 'parapluie', 'un', 'pa.ra.pluie', 'p', 'ui'],
  ['🎨', 'peinture', 'de la', 'pein.ture', 'p', 'yr'],
  ['🏖️', 'plage', 'une', 'plage', 'p', 'aj'],
  ['🐢', 'tortue', 'une', 'tor.tue', 't', 'u'],
  ['🍅', 'tomate', 'une', 'to.mate', 't', 'at'],
  ['🚂', 'train', 'un', 'train', 't', 'in'],
  ['🚕', 'taxi', 'un', 'ta.xi', 't', 'i'],
  ['🌷', 'tulipe', 'une', 'tu.lipe', 't', 'ip'],
  ['🥁', 'tambour', 'un', 'tam.bour', 't', 'ur'],
  ['🐯', 'tigre', 'un', 'tigre', 't', 'igr'],
  ['📞', 'téléphone', 'un', 'té.lé.phone', 't', 'onn'],
  ['🐂', 'taureau', 'un', 'tau.reau', 't', 'o'],
  ['🎺', 'trompette', 'une', 'trom.pette', 't', 'èt'],
  ['📺', 'télé', 'une', 'té.lé', 't', 'é'],
  ['🎈', 'ballon', 'un', 'ba.llon', 'b', 'on'],
  ['⛵', 'bateau', 'un', 'ba.teau', 'b', 'o'],
  ['🍌', 'banane', 'une', 'ba.nane', 'b', 'ane'],
  ['👶', 'bébé', 'un', 'bé.bé', 'b', 'é'],
  ['🚌', 'bus', 'un', 'bus', 'b', 'us'],
  ['🍬', 'bonbon', 'un', 'bon.bon', 'b', 'on'],
  ['🧹', 'balai', 'un', 'ba.lai', 'b', 'è'],
  ['🥣', 'bol', 'un', 'bol', 'b', 'ol'],
  ['🍼', 'biberon', 'un', 'bi.be.ron', 'b', 'on'],
  ['👄', 'bouche', 'une', 'bouche', 'b', 'ouch'],
  ['🕯️', 'bougie', 'une', 'bou.gie', 'b', 'i'],
  ['🐳', 'baleine', 'une', 'ba.leine', 'b', 'èn'],
  ['🛁', 'baignoire', 'une', 'bai.gnoire', 'b', 'oar'],
  ['🥖', 'baguette', 'une', 'ba.guette', 'b', 'èt'],
  ['🪵', 'bois', 'du', 'bois', 'b', 'oi'],
  ['😴', 'dodo', 'du', 'do.do', 'd', 'o'],
  ['🎲', 'dé', 'un', 'dé', 'd', 'é'],
  ['🦖', 'dinosaure', 'un', 'di.no.saure', 'd', 'or'],
  ['🐬', 'dauphin', 'un', 'dau.phin', 'd', 'in'],
  ['🦷', 'dent', 'une', 'dent', 'd', 'an'],
  ['👆', 'doigt', 'un', 'doigt', 'd', 'oi'],
  ['🐉', 'dragon', 'un', 'dra.gon', 'd', 'on'],
  ['🦃', 'dindon', 'un', 'din.don', 'd', 'on'],
  ['🚩', 'drapeau', 'un', 'dra.peau', 'd', 'o'],
  ['🚿', 'douche', 'une', 'douche', 'd', 'ouch'],
  ['🧸', 'doudou', 'un', 'dou.dou', 'd', 'ou'],
  ['🦆', 'canard', 'un', 'ca.nard', 'c', 'ar'],
  ['🎁', 'cadeau', 'un', 'ca.deau', 'c', 'o'],
  ['🚚', 'camion', 'un', 'ca.mion', 'c', 'on'],
  ['🥕', 'carotte', 'une', 'ca.rotte', 'c', 'ot'],
  ['🐷', 'cochon', 'un', 'co.chon', 'c', 'on'],
  ['🐓', 'coq', 'un', 'coq', 'c', 'ok'],
  ['🌵', 'cactus', 'un', 'cac.tus', 'c', 'us'],
  ['🐞', 'coccinelle', 'une', 'coc.ci.nelle', 'c', 'el'],
  ['🔪', 'couteau', 'un', 'cou.teau', 'c', 'o'],
  ['🛖', 'cabane', 'une', 'ca.bane', 'c', 'ane'],
  ['🪨', 'caillou', 'un', 'cail.lou', 'c', 'ou'],
  ['👔', 'cravate', 'une', 'cra.vate', 'c', 'at'],
  ['☕', 'café', 'du', 'ca.fé', 'c', 'é'],
  ['🎥', 'caméra', 'une', 'ca.mé.ra', 'c', 'a'],
  ['🥥', 'coco', 'une', 'co.co', 'c', 'o'],
  ['🎂', 'gâteau', 'un', 'gâ.teau', 'g', 'o'],
  ['🦍', 'gorille', 'un', 'go.rille', 'g', 'ij'],
  ['🧤', 'gant', 'un', 'gant', 'g', 'an'],
  ['🐸', 'grenouille', 'une', 'gre.nouille', 'g', 'uy'],
  ['🍦', 'glace', 'une', 'glace', 'g', 'as'],
  ['🧇', 'gaufre', 'une', 'gaufre', 'g', 'of'],
  ['💧', 'goutte', 'une', 'goutte', 'g', 'ut'],
  // ---- lettres rares et bonus (étape 5) ----
  ['🥝', 'kiwi', 'un', 'ki.wi', 'k', 'i'],
  ['🐨', 'koala', 'un', 'ko.a.la', 'k', 'a'],
  ['🦘', 'kangourou', 'un', 'kan.gou.rou', 'k', 'ou'],
  ['🐦', 'oiseau', 'un', 'oi.seau', 'oi', 'o'],
  ['🪿', 'oie', 'une', 'oie', 'oi', 'oi'],
  ['🦉', 'hibou', 'un', 'hi.bou', null, 'ou'],
  ['🪀', 'yoyo', 'un', 'yo.yo', null, 'o'],
  // ---- sans premier son au programme (rimes, tambour) ----
  ['🎸', 'guitare', 'une', 'gui.tare', null, 'ar'],
  ['🥐', 'croissant', 'un', 'crois.sant', null, 'an'],
  ['🎃', 'citrouille', 'une', 'ci.trouille', null, 'uy'],
  ['❤️', 'cœur', 'un', 'cœur', null, 'eur'],
  ['🚜', 'tracteur', 'un', 'trac.teur', 't', 'eur'],
  ['🎹', 'piano', 'un', 'pi.a.no', 'p', 'o'],
  ['📻', 'radio', 'une', 'ra.di.o', 'r', 'o'],
  ['🐚', 'coquille', 'une', 'co.quille', 'c', 'ij'],
  ['🥚', 'œuf', 'un', 'œuf', null, 'euf'],
  ['🐌', 'escargot', 'un', 'es.car.got', null, 'o'],
  ['🧶', 'laine', 'de la', 'laine', 'l', 'èn'],
];

/** Catalogue des images de lecture. */
export const PICTURES: readonly Picture[] = ROWS.map(([emoji, word, article, syllables, firstSound, rhyme]) => ({
  id: slug(word),
  emoji,
  word,
  article: article === 'un' || article === 'une' ? article : null,
  syllables: syllables.split('.'),
  firstSound,
  rhyme,
}));

const BY_ID: ReadonlyMap<PictureId, Picture> = new Map(PICTURES.map((p) => [p.id, p]));

export function getPicture(id: PictureId): Picture | undefined {
  return BY_ID.get(id);
}

/** Images dont le premier son est ce graphème (mot repère compris). */
export function picturesStartingWith(grapheme: GraphemeId): Picture[] {
  return PICTURES.filter((p) => p.firstSound === grapheme);
}

/**
 * Mots dont le nombre de syllabes ORALES est discutable pour une enfant de 4 ans (e muet final prononcé
 * dans le Midi, diérèses « li-on »). Ils restent dans le catalogue (rime, premier son) mais le tambour
 * ne les interroge JAMAIS : une réponse « fausse » serait un faux négatif.
 */
const DRUM_AMBIGUOUS_WORDS: ReadonlySet<string> = new Set([
  'avion',
  'lion',
  'camion',
  'chien',
  'piano',
  'radio',
  'zombie',
  'nuage',
  'parapluie',
  'pied',
  'oie',
  'roue',
  'tortue',
  'biberon',
  'assiette',
  'noël',
  'nuit',
  'pingouin',
  'bougie',
  'écureuil',
]);

/** Consonne (ou « qu ») puis e final muet, ou « es » final : « banane », « lune », « lunettes ». */
const MUTE_E_END = /[^aeiouyàâäéèêëîïôöùûüœ](e|es)$/;

export function isDrumAmbiguous(picture: Picture): boolean {
  return DRUM_AMBIGUOUS_WORDS.has(picture.word) || MUTE_E_END.test(picture.word);
}

/**
 * Clé du SON initial (pas de la lettre) : « c », « k » et « q » commencent par le même son, « h » est muet.
 * Deux images de même clé ne sont jamais proposées l'une contre l'autre à « qui commence pareil ? ».
 */
export function onsetKey(picture: Picture): string {
  if (picture.firstSound !== null) {
    return picture.firstSound === 'c' || picture.firstSound === 'q' ? 'k' : picture.firstSound;
  }
  const base = picture.word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^h/, '');
  const start = base.startsWith('ch') ? 'ch' : base.startsWith('ou') ? 'ou' : base.startsWith('oi') ? 'oi' : base[0] ?? '';
  return start === 'c' || start === 'q' ? 'k' : start;
}
