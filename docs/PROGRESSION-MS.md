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
