// Catalogue des mots invariables du CE1 (séries 1 à 4 de la liste de la classe). Contenu pédagogique : relire avec soin (voir rapport).
import type { WordId } from '../../engine/types';
import type { WordEntry } from './types';

export const WORDS: Record<WordId, WordEntry> = {
  apres: {
    text: 'après',
    misspellings: { 1: ['aprai', 'aprait'], 2: ['apprès', 'aprè'], 3: ['aprés', 'apres'] },
    gaps: [{ before: 'apr', missing: 'è', after: 's', distractors: ['é', 'ê', 'e'] }],
    sentences: [
      'Le dessert arrive ___ le repas.',
      'On se lave les mains ___ avoir joué dehors.',
      'Elle range ses jouets ___ le jeu.',
    ],
  },
  aupres: {
    text: 'auprès',
    misspellings: { 1: ['opré', 'aupray'], 2: ['oprès', 'aupré'], 3: ['auprés', 'aupres'] },
    gaps: [
      { before: 'aupr', missing: 'è', after: 's', distractors: ['é', 'ê', 'e'] },
      { before: '', missing: 'au', after: 'près', distractors: ['o', 'eau', 'ô'] },
    ],
    sentences: [
      'Reste ___ de moi dans le magasin.',
      'Le chien dort ___ de sa maîtresse.',
      'Assieds-toi ___ de ton frère.',
    ],
  },
  aussi: {
    text: 'aussi',
    misspellings: { 1: ['ossi', 'ocie'], 2: ['auci', 'ausi'], 3: ['aussis', 'aussie'] },
    gaps: [{ before: 'au', missing: 'ss', after: 'i', distractors: ['s', 'c', 'sc'] }],
    sentences: [
      "Moi ___, j'aime les fraises.",
      'Il est grand et ___ très fort.',
      "J'aime le foot et ___ le vélo.",
    ],
  },
  aussitot: {
    text: 'aussitôt',
    misspellings: { 1: ['ossito', 'aucitô'], 2: ['ausitôt', 'aussitau'], 3: ['aussitot', 'aussitôts'] },
    gaps: [
      { before: 'au', missing: 'ss', after: 'itôt', distractors: ['s', 'c', 'sc'] },
      { before: 'aussit', missing: 'ô', after: 't', distractors: ['o', 'ê', 'eau'] },
    ],
    sentences: [
      'Viens ___ que la cloche sonne.',
      'Il a répondu ___ à la maîtresse.',
      'Le chat s’est caché ___ sous le lit.',
    ],
  },
  assez: {
    text: 'assez',
    misspellings: { 1: ['acer', 'asé'], 2: ['assé', 'asser'], 3: ['asez', 'assés'] },
    gaps: [{ before: 'asse', missing: 'z', after: '', distractors: ['s', 'r', 't'] }],
    sentences: [
      "J'ai ___ mangé, merci.",
      'Il fait ___ chaud aujourd’hui.',
      'Tu as ___ joué, il faut ranger.',
    ],
  },
  afin: {
    text: 'afin',
    misspellings: { 1: ['afain', 'afein'], 2: ['aphin', 'afint'], 3: ['affin', 'afins'] },
    gaps: [{ before: 'a', missing: 'f', after: 'in', distractors: ['ff', 'ph', 'v'] }],
    sentences: [
      'Je mets mon manteau ___ de ne pas avoir froid.',
      'Elle se dépêche ___ de ne pas être en retard.',
      'Il s’entraîne tous les jours ___ de progresser.',
    ],
  },
  aujourdhui: {
    text: "aujourd'hui",
    misspellings: { 1: ['ojourdhui', "oujourd'ui"], 2: ["aujourd'ui", "ojourd'hui"], 3: ['aujourdhui', "aujourd'huit"] },
    gaps: [
      { before: '', missing: 'au', after: "jourd'hui", distractors: ['o', 'eau', 'ô'] },
      { before: "aujour", missing: "d'h", after: 'ui', distractors: ['d', 'dh', 'th'] },
    ],
    sentences: [
      'Nous allons à la piscine ___.',
      'Il fait beau ___.',
      'C’est l’anniversaire de mamie ___.',
    ],
  },
  autour: {
    text: 'autour',
    misspellings: { 1: ['otoure', 'ohtour'], 2: ['otour', 'autoure'], 3: ['autours', 'hautour'] },
    gaps: [
      { before: '', missing: 'au', after: 'tour', distractors: ['o', 'eau', 'ô'] },
      { before: 'au', missing: 't', after: 'our', distractors: ['tt', 'd', 'th'] },
    ],
    sentences: [
      'Les enfants courent ___ de l’arbre.',
      'Assieds-toi ___ de la table.',
      'Ils dansent ___ du feu.',
    ],
  },
  autant: {
    text: 'autant',
    misspellings: { 1: ['otan', 'ottent'], 2: ['otant', 'autent'], 3: ['autand', 'autans'] },
    gaps: [
      { before: '', missing: 'au', after: 'tant', distractors: ['o', 'eau', 'ô'] },
      { before: 'autan', missing: 't', after: '', distractors: ['d', 's', 'x'] },
    ],
    sentences: [
      'Il a ___ de billes que son copain.',
      "Je n'ai jamais eu ___ de bonbons !",
      'Elle court ___ que son frère.',
    ],
  },
  autrefois: {
    text: 'autrefois',
    misspellings: { 1: ['otrefoi', 'autrfoa'], 2: ['otrefois', 'autrefoit'], 3: ['autrefoie', 'autrfois'] },
    gaps: [
      { before: 'au', missing: 'tre', after: 'fois', distractors: ['tr', 'ter', 'der'] },
      { before: 'autre', missing: 'f', after: 'ois', distractors: ['ph', 'v', 'ff'] },
    ],
    sentences: [
      'Les enfants jouaient ___ dans la rue.',
      "Il n'y avait pas de voitures ___.",
      'On écrivait ___ des lettres à la main.',
    ],
  },
  alors: {
    text: 'alors',
    misspellings: { 1: ['alaure', 'allaur'], 2: ['allors', 'alore'], 3: ['alor', 'alort'] },
    gaps: [
      { before: 'al', missing: 'o', after: 'rs', distractors: ['au', 'eau', 'ô'] },
      { before: 'alor', missing: 's', after: '', distractors: ['t', 'd', 'x'] },
    ],
    sentences: [
      'Il pleut, ___ je prends mon parapluie.',
      'Tu as fini ? ___ viens jouer !',
      'Le chat a eu peur, ___ il s’est sauvé.',
    ],
  },
  autrement: {
    text: 'autrement',
    misspellings: { 1: ['otreman', 'autreuman'], 2: ['otrement', 'autremant'], 3: ['autremen', 'autrements'] },
    gaps: [
      { before: '', missing: 'au', after: 'trement', distractors: ['o', 'eau', 'ô'] },
      { before: 'autrem', missing: 'en', after: 't', distractors: ['an', 'em', 'am'] },
    ],
    sentences: [
      'Mets ton manteau, ___ tu auras froid.',
      'Dépêche-toi, ___ nous serons en retard.',
      'Essaie de faire ___, ce sera plus facile.',
    ],
  },
  avant: {
    text: 'avant',
    misspellings: { 1: ['avhan', 'havand'], 2: ['avand', 'avans'], 3: ['avan', 'avants'] },
    gaps: [
      { before: 'av', missing: 'an', after: 't', distractors: ['en', 'em', 'am'] },
      { before: 'avan', missing: 't', after: '', distractors: ['d', 's', 'x'] },
    ],
    sentences: [
      'Je me lave les mains ___ de manger.',
      'Il arrive toujours ___ moi.',
      'Range ta chambre ___ le dîner.',
    ],
  },
  avec: {
    text: 'avec',
    misspellings: { 1: ['avèque', 'aveck'], 2: ['aveque', 'avek'], 3: ['avecq', 'avèc'] },
    gaps: [
      { before: 'av', missing: 'e', after: 'c', distractors: ['è', 'é', 'ai'] },
      { before: 'ave', missing: 'c', after: '', distractors: ['k', 'que', 'q'] },
    ],
    sentences: ['Je joue ___ mon frère.', 'Elle mange sa soupe ___ une cuillère.', 'Viens ___ nous au parc !'],
  },
  beaucoup: {
    text: 'beaucoup',
    misspellings: { 1: ['bokou', 'baucou'], 2: ['bocoup', 'beaucout'], 3: ['beaucou', 'beaucoups'] },
    gaps: [
      { before: 'b', missing: 'eau', after: 'coup', distractors: ['o', 'au', 'ô'] },
      { before: 'beaucou', missing: 'p', after: '', distractors: ['t', 's', 'd'] },
    ],
    sentences: [
      'Il y a ___ de monde au marché.',
      "J'aime ___ les crêpes.",
      'Merci ___ pour ton cadeau !',
    ],
  },
  bien: {
    text: 'bien',
    misspellings: { 1: ['bein', 'biain'], 2: ['biin', 'byen'], 3: ['bient', 'bienn'] },
    gaps: [{ before: 'bi', missing: 'en', after: '', distractors: ['in', 'ein', 'ain'] }],
    sentences: ['Je dors ___ dans mon lit.', 'Elle chante très ___.', 'Tu as ___ travaillé.'],
  },
  bientot: {
    text: 'bientôt',
    misspellings: { 1: ['biintô', 'bientau'], 2: ['biento', 'bientaut'], 3: ['bientot', 'bientôts'] },
    gaps: [
      { before: 'bient', missing: 'ô', after: 't', distractors: ['o', 'au', 'eau'] },
      { before: 'bi', missing: 'en', after: 'tôt', distractors: ['in', 'ain', 'an'] },
    ],
    sentences: ['Ce sera ___ les vacances !', 'À ___, les amis !', 'Le bus va arriver ___.'],
  },
  car: {
    text: 'car',
    misspellings: { 1: ['kar', 'quare'], 2: ['care', 'quar'], 3: ['card', 'carr'] },
    gaps: [
      { before: '', missing: 'c', after: 'ar', distractors: ['k', 'qu', 'q'] },
      { before: 'ca', missing: 'r', after: '', distractors: ['re', 'rt', 'rd'] },
    ],
    sentences: [
      'Je mets un pull ___ il fait froid.',
      'Elle rit ___ le clown est drôle.',
      'Il dort ___ il est fatigué.',
    ],
  },
  ceci: {
    text: 'ceci',
    misspellings: { 1: ['sessi', 'ceussi'], 2: ['cessi', 'sesi'], 3: ['ceçi', 'seci'] },
    gaps: [
      { before: '', missing: 'c', after: 'eci', distractors: ['s', 'ss', 'ç'] },
      { before: 'ce', missing: 'c', after: 'i', distractors: ['s', 'ss', 'ç'] },
    ],
    sentences: [
      "Regarde ___ : c'est un nid d'oiseau.",
      "Prends ___, c'est pour toi.",
      'Lis ___ avant de commencer.',
    ],
  },
  cela: {
    text: 'cela',
    misspellings: { 1: ['sella', 'ceulas'], 2: ['sela', 'cella'], 3: ['celà', 'çela'] },
    gaps: [
      { before: '', missing: 'c', after: 'ela', distractors: ['s', 'ss', 'ç'] },
      { before: 'cel', missing: 'a', after: '', distractors: ['à', 'as', 'ah'] },
    ],
    sentences: ['Tout ___ est à moi.', 'Je ne veux pas ___ !', 'Qui a fait ___ ?'],
  },
};
