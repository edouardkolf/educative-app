// Catalogue des 10 mots invariables du CE1. Contenu pédagogique : relire avec soin (voir rapport).
import type { WordId } from '../../engine/types';
import type { WordEntry } from './types';

export const WORDS: Record<WordId, WordEntry> = {
  apres: {
    text: 'après',
    misspellings: ['apres', 'aprés', 'aprais'],
    gaps: [{ before: 'apr', missing: 'è', after: 's', distractors: ['é', 'ê', 'e'] }],
    sentences: [
      'Le dessert arrive ___ le repas.',
      'On se lave les mains ___ avoir joué dehors.',
      'Elle range ses jouets ___ le jeu.',
    ],
  },
  aupres: {
    text: 'auprès',
    misspellings: ['auprés', 'aupré', 'oprès'],
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
    misspellings: ['ausi', 'ossi', 'auci'],
    gaps: [{ before: 'au', missing: 'ss', after: 'i', distractors: ['s', 'c', 'sc'] }],
    sentences: [
      "Moi ___, j'aime les fraises.",
      'Il est grand et ___ très fort.',
      "J'aime le foot et ___ le vélo.",
    ],
  },
  aussitot: {
    text: 'aussitôt',
    misspellings: ['ausitôt', 'aussitot', 'aussitôts'],
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
    misspellings: ['asser', 'assé', 'asez'],
    gaps: [{ before: 'asse', missing: 'z', after: '', distractors: ['s', 'r', 't'] }],
    sentences: [
      "J'ai ___ mangé, merci.",
      'Il fait ___ chaud aujourd’hui.',
      'Tu as ___ joué, il faut ranger.',
    ],
  },
  afin: {
    text: 'afin',
    misspellings: ['affin', 'afain', 'afint'],
    gaps: [{ before: 'a', missing: 'f', after: 'in', distractors: ['ff', 'ph', 'v'] }],
    sentences: [
      'Je mets mon manteau ___ de ne pas avoir froid.',
      'Elle se dépêche ___ de ne pas être en retard.',
      'Il s’entraîne tous les jours ___ de progresser.',
    ],
  },
  aujourdhui: {
    text: "aujourd'hui",
    misspellings: ['aujourdhui', "aujourd'huit", "ojourd'hui"],
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
    misspellings: ['otour', 'autours', 'autoure'],
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
    misspellings: ['otant', 'autent', 'autand'],
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
    misspellings: ['autrfois', 'autrefoit', 'otrefois'],
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
};
