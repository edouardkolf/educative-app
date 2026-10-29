// Catalogue du pendu (docs/specs/MORPION-PENDU.md §4.2) : mots du quotidien d'un enfant de CE1, chacun
// avec un indice court qu'il peut lire seul (ou se faire lire). Lettres a à z, accents permis
// (é, è, ê, à, â, î, ô, û, ç…) ; ni espace, ni trait d'union, ni apostrophe. Un indice ne contient
// jamais le mot. Ajouter un mot = ajouter une ligne : `content.test.ts` vérifie tout au build.
import type { HangmanWord } from './types';

const W = (id: string, word: string, hint: string): HangmanWord => ({ id, word, hint });

export const HANGMAN_WORDS: readonly HangmanWord[] = [
  // Animaux
  W('dauphin', 'dauphin', 'Il vit dans la mer'),
  W('requin', 'requin', 'Poisson aux dents pointues'),
  W('lion', 'lion', "C'est un roi"),
  W('lapin', 'lapin', 'Il a de grandes oreilles et mange des carottes'),
  W('cheval', 'cheval', 'On monte sur son dos pour galoper'),
  W('vache', 'vache', 'Elle donne du lait'),
  W('mouton', 'mouton', 'Sa laine tient chaud'),
  W('cochon', 'cochon', 'Il est rose et aime la boue'),
  W('poule', 'poule', 'Elle pond des œufs'),
  W('canard', 'canard', 'Il fait coin-coin'),
  W('souris', 'souris', 'Petit animal qui a peur du chat'),
  W('girafe', 'girafe', 'Elle a un très long cou'),
  W('zebre', 'zèbre', 'Cheval à rayures noires et blanches'),
  W('tigre', 'tigre', 'Grand félin à rayures orange'),
  W('singe', 'singe', 'Il grimpe aux arbres et adore les bananes'),
  W('tortue', 'tortue', 'Elle porte sa maison sur son dos'),
  W('escargot', 'escargot', 'Il avance tout doucement avec sa coquille'),
  W('papillon', 'papillon', 'Il vole avec des ailes colorées'),
  W('abeille', 'abeille', 'Elle fabrique du miel'),
  W('hibou', 'hibou', 'Oiseau de la nuit aux grands yeux'),
  W('renard', 'renard', 'Animal roux et rusé de la forêt'),
  W('ours', 'ours', 'Gros animal poilu qui adore le miel'),
  W('baleine', 'baleine', 'Le plus gros animal de la mer'),
  W('crocodile', 'crocodile', 'Il a une très grande bouche et vit près des rivières'),
  W('grenouille', 'grenouille', 'Elle saute et fait croa croa'),
  W('pingouin', 'pingouin', 'Oiseau noir et blanc des pays froids'),
  W('kangourou', 'kangourou', 'Il saute et porte son bébé dans une poche'),
  W('herisson', 'hérisson', 'Petit animal couvert de piquants'),
  W('ecureuil', 'écureuil', "Il cache des noisettes pour l'hiver"),
  W('araignee', 'araignée', 'Elle a huit pattes et tisse une toile'),
  W('elephant', 'éléphant', 'Il a une trompe'),
  W('serpent', 'serpent', "Il n'a pas de pattes et il rampe"),
  W('pieuvre', 'pieuvre', 'Animal de la mer qui a huit bras'),
  W('mouette', 'mouette', 'Oiseau blanc qui crie au bord de la mer'),

  // Fruits et légumes
  W('abricot', 'abricot', "Fruit d'été"),
  W('pomme', 'pomme', 'Fruit rouge ou vert qui croque'),
  W('banane', 'banane', "Fruit jaune qu'on épluche"),
  W('fraise', 'fraise', 'Petit fruit rouge du printemps'),
  W('cerise', 'cerise', 'Petit fruit rouge à noyau, souvent par deux'),
  W('orange', 'orange', 'Un fruit et une couleur à la fois'),
  W('citron', 'citron', 'Fruit jaune très acide'),
  W('raisin', 'raisin', 'Petits fruits qui poussent en grappe'),
  W('poire', 'poire', 'Fruit vert ou jaune en forme de goutte'),
  W('melon', 'melon', "Gros fruit d'été, orange à l'intérieur"),
  W('carotte', 'carotte', 'Légume orange que mange le lapin'),
  W('tomate', 'tomate', "Fruit rouge qu'on met dans la salade"),
  W('citrouille', 'citrouille', "Gros légume orange d'Halloween"),
  W('salade', 'salade', 'Feuilles vertes à manger avec une vinaigrette'),
  W('ananas', 'ananas', 'Fruit avec une couronne de feuilles'),
  W('champignon', 'champignon', 'Il pousse dans la forêt après la pluie'),

  // À manger
  W('gateau', 'gâteau', 'On souffle ses bougies à un anniversaire'),
  W('chocolat', 'chocolat', 'Douceur marron faite avec du cacao'),
  W('pain', 'pain', "On l'achète chez le boulanger"),
  W('fromage', 'fromage', 'Il est fait avec du lait et parfois il sent fort'),
  W('pizza', 'pizza', "Plat rond d'Italie avec de la tomate"),
  W('bonbon', 'bonbon', 'Petite sucrerie'),
  W('crepe', 'crêpe', 'On la fait sauter dans la poêle'),
  W('confiture', 'confiture', "On l'étale sur une tartine"),

  // L'école
  W('cartable', 'cartable', "Sac pour aller à l'école"),
  W('crayon', 'crayon', 'Il sert à écrire et on le taille'),
  W('gomme', 'gomme', 'Elle efface les traits de crayon'),
  W('cahier', 'cahier', "On écrit dedans à l'école"),
  W('livre', 'livre', 'On le lit, page après page'),
  W('regle', 'règle', 'Elle sert à tracer des traits bien droits'),
  W('ciseaux', 'ciseaux', 'Ils servent à découper'),
  W('maitresse', 'maîtresse', 'Elle fait la classe'),
  W('tableau', 'tableau', 'On y écrit à la craie ou au feutre'),
  W('recreation', 'récréation', 'Le moment où on joue dans la cour'),

  // La maison et les objets
  W('maison', 'maison', 'On y habite'),
  W('fenetre', 'fenêtre', 'On regarde dehors à travers elle'),
  W('lit', 'lit', 'On dort dedans'),
  W('chaise', 'chaise', "On s'assoit dessus"),
  W('table', 'table', 'On mange autour'),
  W('lampe', 'lampe', 'Elle éclaire la pièce'),
  W('parapluie', 'parapluie', 'Il protège de la pluie'),
  W('telephone', 'téléphone', "On l'utilise pour appeler"),
  W('ballon', 'ballon', 'On joue au foot avec'),
  W('poupee', 'poupée', 'Jouet qui ressemble à un bébé'),
  W('cle', 'clé', 'Elle ouvre la porte'),
  W('miroir', 'miroir', "On peut s'y voir"),

  // La nature, le ciel
  W('soleil', 'soleil', 'Il brille dans le ciel le jour'),
  W('lune', 'lune', 'Elle éclaire le ciel la nuit'),
  W('etoile', 'étoile', 'Elle scintille dans le ciel la nuit'),
  W('nuage', 'nuage', 'Il flotte dans le ciel et apporte la pluie'),
  W('neige', 'neige', 'Elle tombe en hiver, toute blanche'),
  W('arbre', 'arbre', 'Il a un tronc et des feuilles'),
  W('fleur', 'fleur', 'Elle pousse dans le jardin et sent bon'),
  W('montagne', 'montagne', 'Très haute, on peut y faire du ski'),
  W('riviere', 'rivière', "L'eau y coule jusqu'à la mer"),
  W('plage', 'plage', 'On y fait des châteaux de sable'),
  W('volcan', 'volcan', 'Montagne qui crache du feu'),
  W('foret', 'forêt', "Endroit où il y a beaucoup d'arbres"),
  W('fusee', 'fusée', "Elle part dans l'espace"),

  // Les transports
  W('voiture', 'voiture', 'Elle a quatre roues et un volant'),
  W('velo', 'vélo', 'Il a deux roues et des pédales'),
  W('avion', 'avion', 'Il vole dans le ciel avec des passagers'),
  W('bateau', 'bateau', "Il flotte sur l'eau"),
  W('train', 'train', 'Il roule sur des rails'),
  W('camion', 'camion', 'Gros véhicule qui transporte des marchandises'),
  W('tracteur', 'tracteur', 'Il travaille dans les champs'),

  // Le corps, les vêtements
  W('main', 'main', 'Elle a cinq doigts'),
  W('dent', 'dent', 'On la brosse matin et soir'),
  W('nez', 'nez', 'Il sert à sentir les odeurs'),
  W('oreille', 'oreille', 'Elle sert à entendre'),
  W('chapeau', 'chapeau', 'On le met sur la tête'),
  W('echarpe', 'écharpe', 'On la met autour du cou quand il fait froid'),
  W('chaussure', 'chaussure', 'On la met au pied'),
  W('pyjama', 'pyjama', 'On le met pour dormir'),

  // Les personnages et les métiers
  W('pompier', 'pompier', 'Il éteint le feu'),
  W('docteur', 'docteur', 'Il soigne les malades'),
  W('pirate', 'pirate', 'Il navigue sur la mer pour trouver un trésor'),
  W('sorciere', 'sorcière', 'Elle a un balai et un chapeau pointu'),
  W('dragon', 'dragon', 'Animal imaginaire qui crache du feu'),
  W('chateau', 'château', 'Le roi et la reine y habitent'),
];

export const HANGMAN_WORDS_BY_ID: ReadonlyMap<string, HangmanWord> = new Map(HANGMAN_WORDS.map((w) => [w.id, w]));
