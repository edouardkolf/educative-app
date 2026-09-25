# Progression Moyenne section (V1)

Repères : programme de maternelle, cycle 1, domaine « Construire les premiers outils pour structurer sa pensée ».
En moyenne section, on vise des algorithmes simples (2 puis 3 éléments), le dénombrement jusqu'à 5 ou 6,
avec les constellations du dé, la discrimination visuelle (couleur, forme, catégorie), les mélanges de couleurs,
et le tri par famille (ferme, mer, ciel).

**Principe de la carte** : les cinq mécaniques sont intercalées (suite, compter, intrus, parfois couleurs, parfois
trieur, puis on recommence). On varie ainsi l'activité, et chaque mécanique monte en difficulté par petites marches.
Chaque mécanique commence par un niveau avec tutoriel : une main montre le geste (deux taps pour color-mix : les
deux fioles à verser ; le panier à taper pour sort).

| # | id | Mécanique | Compétence | Ce qui change par rapport au niveau précédent de la même mécanique |
|---|---|---|---|---|
| 1 | ms-suite-01 | suite | patterns | AB, 2 couleurs, 2 choix, **tutoriel** |
| 2 | ms-compte-01 | compter | counting | 1 à 3 objets alignés, réponses chiffre + points, **tutoriel** |
| 3 | ms-intrus-01 | intrus | visual-discrimination | 3 éléments, l'intrus a une autre couleur, **tutoriel** |
| 4 | ms-couleurs-01 | color-mix | color-mixing | orange, vert, violet, **tutoriel** |
| 5 | ms-suite-02 | suite | patterns | AB couleurs, 3 choix (une couleur piège) |
| 6 | ms-compte-02 | compter | counting | 1 à 4, alignés |
| 7 | ms-intrus-02 | intrus | visual-discrimination | 4 éléments, l'intrus a une autre forme |
| 8 | ms-tri-01 | sort | categorization | 2 paniers (ferme, mer), **tutoriel** |
| 9 | ms-suite-03 | suite | patterns | AB, formes (même couleur) |
| 10 | ms-suite-nature-01 | suite | patterns | AB, objets (animaux) au lieu de formes/couleurs |
| 11 | ms-compte-03 | compter | counting | 1 à 5, constellations du dé |
| 12 | ms-intrus-03 | intrus | visual-discrimination | couleur différente, mais les formes varient (distracteur) |
| 13 | ms-couleurs-02 | color-mix | color-mixing | orange, vert, violet, sans tutoriel |
| 14 | ms-suite-04 | suite | patterns | AAB couleurs |
| 15 | ms-compte-04 | compter | counting | 2 à 5, éparpillés, 4 choix |
| 16 | ms-intrus-04 | intrus | categorization | 4 objets : fruits contre animaux |
| 17 | ms-tri-02 | sort | categorization | 2 paniers (ferme, mer), 5 manches, sans tutoriel |
| 18 | ms-suite-05 | suite | patterns | ABB formes |
| 19 | ms-suite-nature-02 | suite | patterns | AAB, objets (plantes) |
| 20 | ms-compte-05 | compter | counting | 3 à 6, constellations, chiffres seuls |
| 21 | ms-intrus-05 | intrus | visual-discrimination | 5 éléments, forme différente, les couleurs varient |
| 22 | ms-couleurs-03 | color-mix | color-mixing | ajoute les couleurs pures (rouge, jaune, bleu) aux mélanges |
| 23 | ms-suite-06 | suite | patterns | ABC couleurs |
| 24 | ms-suite-nature-03 | suite | patterns | ABC, objets (animaux et plantes mêlés), trou au milieu, 4 choix |
| 25 | ms-compte-06 | compter | counting | 4 à 6, éparpillés, chiffres seuls |
| 26 | ms-intrus-06 | intrus | categorization | 5 objets, 4 catégories possibles |
| 27 | ms-tri-03 | sort | categorization | 3 paniers (ferme, mer, ciel) |
| 28 | ms-suite-07 | suite | patterns | AB couleur + forme, **trou au milieu** |
| 29 | ms-suite-08 | suite | patterns | ABC formes, trou au milieu, 4 choix |

Paramètres communs : 5 manches par niveau (4 pour les tutoriels), seuils d'étoiles par défaut
(0 raté du premier coup = 3 étoiles, 1 raté = 2 étoiles, sinon 1).

**Color-mix** (« le laboratoire des couleurs ») : verser deux fioles primaires dans le chaudron pour obtenir la
couleur cible affichée en haut de l'écran. La réponse envoyée au moteur est la couleur RÉSULTANTE du mélange
(pas la fiole tapée) : voir docs/CONTENU.md.

**Sort** (« le trieur magique ») : glisser-déposer OU taper un panier pour y ranger un animal (seule mécanique qui
accepte le glisser-déposer). `round.answer` est l'id du panier propriétaire de l'objet : voir docs/CONTENU.md.

**À observer dans les statistiques** : un taux de réussite au premier coup sous 50 % sur deux parties signale une marche trop haute.
Deux corrections possibles : ajouter un niveau intermédiaire (du JSON) ou rebloquer temporairement le niveau depuis l'espace parent.
