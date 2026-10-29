# Progression Moyenne section (V1)

Repères : programme de maternelle, cycle 1, domaine « Construire les premiers outils pour structurer sa pensée ».
En moyenne section, on vise des algorithmes simples (2 puis 3 éléments), le dénombrement jusqu'à 5 ou 6,
avec les constellations du dé, la discrimination visuelle (couleur, forme, catégorie), les mélanges de couleurs,
le tri par famille (ferme, mer, ciel), et la reconnaissance de formes géométriques simples (rond, carré, triangle,
rectangle) par un assemblage spatial.

**Principe de la carte** : les six mécaniques sont intercalées (suite, compter, intrus, parfois couleurs, parfois
trieur ou constructeur, puis on recommence). On varie ainsi l'activité, et chaque mécanique monte en difficulté par
petites marches. Chaque mécanique commence par un niveau avec tutoriel : une main montre le geste (deux taps pour
color-mix : les deux fioles à verser ; le panier à taper pour sort ; une pièce puis son emplacement pour builder).

| # | id | Mécanique | Compétence | Ce qui change par rapport au niveau précédent de la même mécanique |
|---|---|---|---|---|
| 1 | ms-suite-01 | suite | patterns | AB, 2 couleurs, 2 choix, **tutoriel** |
| 2 | ms-compte-01 | compter | counting | 1 à 3 objets alignés, réponses chiffre + points, **tutoriel** |
| 3 | ms-intrus-01 | intrus | visual-discrimination | 3 éléments, l'intrus a une autre couleur, **tutoriel** |
| 4 | ms-couleurs-01 | color-mix | color-mixing | orange, vert, violet, **tutoriel** |
| 5 | ms-suite-02 | suite | patterns | AB couleurs, 3 choix (une couleur piège) |
| 6 | ms-compte-02 | compter | counting | 1 à 4, alignés |
| 7 | ms-formes-01 | builder | shapes | maison, sapin, bateau (2-3 pièces), sans pièce en trop, **tutoriel** |
| 8 | ms-intrus-02 | intrus | visual-discrimination | 4 éléments, l'intrus a une autre forme |
| 9 | ms-tri-01 | sort | categorization | 2 paniers (ferme, mer), **tutoriel** |
| 10 | ms-suite-03 | suite | patterns | AB, formes (même couleur) |
| 11 | ms-suite-nature-01 | suite | patterns | AB, objets (animaux) au lieu de formes/couleurs |
| 12 | ms-compte-03 | compter | counting | 1 à 5, constellations du dé |
| 13 | ms-intrus-03 | intrus | visual-discrimination | couleur différente, mais les formes varient (distracteur) |
| 14 | ms-couleurs-02 | color-mix | color-mixing | orange, vert, violet, sans tutoriel |
| 15 | ms-suite-04 | suite | patterns | AAB couleurs |
| 16 | ms-compte-04 | compter | counting | 2 à 5, éparpillés, 4 choix |
| 17 | ms-formes-02 | builder | shapes | voiture, fusée, poisson (2-4 pièces), 1 pièce en trop, sans tutoriel |
| 18 | ms-intrus-04 | intrus | categorization | 4 objets : fruits contre animaux |
| 19 | ms-tri-02 | sort | categorization | 2 paniers (ferme, mer), 5 manches, sans tutoriel |
| 20 | ms-suite-05 | suite | patterns | ABB formes |
| 21 | ms-suite-nature-02 | suite | patterns | AAB, objets (plantes) |
| 22 | ms-compte-05 | compter | counting | 3 à 6, constellations, chiffres seuls |
| 23 | ms-intrus-05 | intrus | visual-discrimination | 5 éléments, forme différente, les couleurs varient |
| 24 | ms-couleurs-03 | color-mix | color-mixing | ajoute les couleurs pures (rouge, jaune, bleu) aux mélanges |
| 25 | ms-suite-06 | suite | patterns | ABC couleurs |
| 26 | ms-suite-nature-03 | suite | patterns | ABC, objets (animaux et plantes mêlés), trou au milieu, 4 choix |
| 27 | ms-compte-06 | compter | counting | 4 à 6, éparpillés, chiffres seuls |
| 28 | ms-formes-03 | builder | shapes | robot, bonhomme de neige, château (3-5 pièces), 2 pièces en trop, sans tutoriel |
| 29 | ms-intrus-06 | intrus | categorization | 5 objets, 4 catégories possibles |
| 30 | ms-tri-03 | sort | categorization | 3 paniers (ferme, mer, ciel) |
| 31 | ms-suite-07 | suite | patterns | AB couleur + forme, **trou au milieu** |
| 32 | ms-suite-08 | suite | patterns | ABC formes, trou au milieu, 4 choix |

Paramètres communs : 5 manches par niveau (4 pour les tutoriels ; 3 pour builder — voir plus bas), seuils d'étoiles
par défaut (0 raté du premier coup = 3 étoiles, 1 raté = 2 étoiles, sinon 1).

**Color-mix** (« le laboratoire des couleurs ») : verser deux fioles primaires dans le chaudron pour obtenir la
couleur cible affichée en haut de l'écran. La réponse envoyée au moteur est la couleur RÉSULTANTE du mélange
(pas la fiole tapée) : voir docs/CONTENU.md.

**Sort** (« le trieur magique ») : glisser-déposer OU taper un panier pour y ranger un animal (avec builder, seule
mécanique qui accepte le glisser-déposer). `round.answer` est l'id du panier propriétaire de l'objet : voir
docs/CONTENU.md.

**Builder** (« le constructeur ») : glisser-déposer OU sélectionner une pièce puis taper son emplacement pour
reconstituer une figure (maison, voiture, robot…). `round.answer` vaut toujours `"done"` (voir docs/CONTENU.md) :
une manche = **une figure entière**, avec plusieurs emplacements à remplir. Une seule pose ratée sur l'un d'eux
fait donc échouer le « premier coup » de toute la manche — contrairement aux autres mécaniques où une manche est
un seul choix. C'est pourquoi ms-formes-02 et ms-formes-03 (plus de pièces, avec des distracteurs) assouplissent
les seuils d'étoiles (`{ "maxMissesFor3": 1, "maxMissesFor2": 3 }`) : ms-formes-01, plus simple (2-3 pièces, aucune
pièce en trop), garde les seuils par défaut. 3 manches par niveau (au lieu de 5) : chaque manche demande déjà
plusieurs poses.

**À observer dans les statistiques** : un taux de réussite au premier coup sous 50 % sur deux parties signale une marche trop haute.
Deux corrections possibles : ajouter un niveau intermédiaire (du JSON) ou rebloquer temporairement le niveau depuis l'espace parent.

## Raisonnement : jeux de logique (29/10/2026)

Une place sur cinq (5, 10… 40) est un niveau de raisonnement, sans texte (docs/specs/JEUX-LOGIQUE.md). La carte compte
désormais 20 niveaux par monde : forêt (1–20), mer (21–40), montagne (41–60). Un test vérifie l'alternance au build.

| Place | id | Monde | Contenu |
|---|---|---|---|
| 5 | ms-robot-01 | Forêt | Robot pas à pas 4×4, sans rocher, chemin 2–3, 4 manches, **tutoriel** |
| 10 | ms-code-01 | Forêt | Code secret 2 pions / 3 couleurs, une marque par pion, 5 essais, **tutoriel** |
| 15 | ms-morpion-01 | Forêt | Morpion contre le téléphone facile, coup de pouce, 2 grilles gagnantes, 3 vies, **tutoriel** |
| 20 | ms-robot-02 | Forêt | Robot pas à pas 4×4, 1 rocher, chemin 3–4 |
| 25 | ms-code-02 | Mer | Code secret 2 pions / 4 couleurs, 5 essais |
| 30 | ms-morpion-02 | Mer | Morpion facile, coup de pouce, on commence une grille sur deux |
| 35 | ms-robot-03 | Mer | Robot pas à pas 4×4, 3 rochers, chemin 4–6 |
| 40 | ms-code-03 | Mer | Code secret 3 pions / 4 couleurs, 6 essais |

## Monde 3 : la montagne — memory, ranger, labyrinthe (29/10/2026)

Choix du PM : « 3, 5 et 6 vu ce que la petite aime bien » (docs/specs/JEUX-MATERNELLE.md). 20 niveaux (41–60), sans
texte, avec l'alternance habituelle : un niveau de raisonnement aux places 45, 50, 55, 60. Chaque nouveau jeu commence
par un niveau avec tutoriel ; le labyrinthe passe de « taper les cases » à « tracer au doigt » au niveau 52.

| Place | id | Contenu |
|---|---|---|
| 41 | ms-memoire-01 | Memory 2 paires, aperçu 2 s, **tutoriel** |
| 42 | ms-ranger-01 | Ranger 3 tailles très différentes, **tutoriel** |
| 43 | ms-labyrinthe-01 | Labyrinthe 4×4, taper les cases, **tutoriel** |
| 44 | ms-memoire-02 | Memory 3 paires, aperçu 1,5 s |
| 45 | ms-robot-04 | Robot pas à pas 5×5, 3 rochers, chemin 4–6 |
| 46 | ms-ranger-02 | Ranger 4 tailles |
| 47 | ms-labyrinthe-02 | Labyrinthe 5×5, taper |
| 48 | ms-intrus-07 | Intrus par catégorie, 6 éléments, avec distracteurs |
| 49 | ms-memoire-03 | Memory 4 paires, aperçu 1 s |
| 50 | ms-code-04 | Code secret 3 pions / 5 couleurs |
| 51 | ms-ranger-03 | Ranger 3 quantités (1 à 6 points), **tutoriel** |
| 52 | ms-labyrinthe-03 | Labyrinthe 5×5, **tracer au doigt**, **tutoriel** |
| 53 | ms-suite-09 | Suite AABC, couleur et forme, trou au milieu |
| 54 | ms-memoire-04 | Memory 5 paires, sans aperçu |
| 55 | ms-morpion-03 | Morpion facile, sans coup de pouce, on commence une grille sur deux |
| 56 | ms-ranger-04 | Ranger 5 tailles proches |
| 57 | ms-labyrinthe-04 | Labyrinthe 6×6, tracer |
| 58 | ms-ranger-05 | Ranger 4 quantités (1 à 9 points) |
| 59 | ms-memoire-05 | Memory 6 paires |
| 60 | ms-robot-05 | Robot pas à pas 5×5, 5 rochers, chemin 6–8 |

**Jeu libre memory** (hub de la petite) : ★ 3 paires avec aperçu, ★★ 6 paires, ★★★ 8 paires.

## Jeu libre : le coloriage magique (hors carte)

Accessible depuis le hub, en illimité (dans la limite du minuteur et du quota) : il ne donne ni étoile, ni niveau.
Elle peint les figures du constructeur (fusée, château, maison…) avec trois gouttes primaires. Un petit récipient
mélange deux gouttes au plus, comme le laboratoire des couleurs : le jeu entraîne le mélange sans tableau à lire.

Le **code magique** se complique par paliers ; aucun code n'est en couleur au-delà du palier 1 :

| Palier | Code dans la case | Légende | Cases par dessin |
|---|---|---|---|
| 1 Goutte | la couleur à obtenir, comme au labo | non | 6 à 9 |
| 2 Objet | un objet du labo en gris : se souvenir de sa couleur (la carotte est orange) | non | 9 à 13 |
| 3 Formes | rond, carré, triangle, étoile, cœur, losange | forme → goutte | 9 à 13 |
| 4 Dé | constellation de 1 à 6, comme dans « compter » | constellation → goutte | 12 à 17 |

- **Passage automatique**, sans texte : **montée** après 3 dessins si au moins 80 % des cases sont justes du premier coup,
  **descente** après 2 dessins sous 50 %. Chaque changement remet le compte à zéro.
- L'espace parent peut **forcer un palier** (fiche de l'enfant). Les dessins joués à un palier forcé ne comptent pas
  dans le calcul automatique.
- 12 dessins en V1. Les dessins finis vont sur le frigo ; un dessin interrompu reprend là où elle s'est arrêtée.
- **À observer dans les statistiques** : la réussite du premier coup et les recettes de couleurs ratées. Une recette
  ratée souvent (le violet, par exemple) se retravaille au labo, sur la carte.

Détails : `docs/specs/COLORIAGE.md`. Contenu : `docs/CONTENU.md`.
