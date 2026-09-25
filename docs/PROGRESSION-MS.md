# Progression Moyenne section (V1)

Repères : programme de maternelle, cycle 1, domaine « Construire les premiers outils pour structurer sa pensée ».
En moyenne section, on vise des algorithmes simples (2 puis 3 éléments), le dénombrement jusqu'à 5 ou 6,
avec les constellations du dé, et la discrimination visuelle (couleur, forme, catégorie).

**Principe de la carte** : les trois mécaniques sont intercalées (suite, compter, intrus, puis on recommence).
On varie ainsi l'activité, et chaque mécanique monte en difficulté par petites marches.
Chaque mécanique commence par un niveau avec tutoriel : une main montre le geste.

| # | id | Mécanique | Compétence | Ce qui change par rapport au niveau précédent de la même mécanique |
|---|---|---|---|---|
| 1 | ms-suite-01 | suite | patterns | AB, 2 couleurs, 2 choix, **tutoriel** |
| 2 | ms-compte-01 | compter | counting | 1 à 3 objets alignés, réponses chiffre + points, **tutoriel** |
| 3 | ms-intrus-01 | intrus | visual-discrimination | 3 éléments, l'intrus a une autre couleur, **tutoriel** |
| 4 | ms-suite-02 | suite | patterns | AB couleurs, 3 choix (une couleur piège) |
| 5 | ms-compte-02 | compter | counting | 1 à 4, alignés |
| 6 | ms-intrus-02 | intrus | visual-discrimination | 4 éléments, l'intrus a une autre forme |
| 7 | ms-suite-03 | suite | patterns | AB, formes (même couleur) |
| 8 | ms-compte-03 | compter | counting | 1 à 5, constellations du dé |
| 9 | ms-intrus-03 | intrus | visual-discrimination | couleur différente, mais les formes varient (distracteur) |
| 10 | ms-suite-04 | suite | patterns | AAB couleurs |
| 11 | ms-compte-04 | compter | counting | 2 à 5, éparpillés, 4 choix |
| 12 | ms-intrus-04 | intrus | categorization | 4 objets : fruits contre animaux |
| 13 | ms-suite-05 | suite | patterns | ABB formes |
| 14 | ms-compte-05 | compter | counting | 3 à 6, constellations, chiffres seuls |
| 15 | ms-intrus-05 | intrus | visual-discrimination | 5 éléments, forme différente, les couleurs varient |
| 16 | ms-suite-06 | suite | patterns | ABC couleurs |
| 17 | ms-compte-06 | compter | counting | 4 à 6, éparpillés, chiffres seuls |
| 18 | ms-intrus-06 | intrus | categorization | 5 objets, 4 catégories possibles |
| 19 | ms-suite-07 | suite | patterns | AB couleur + forme, **trou au milieu** |
| 20 | ms-suite-08 | suite | patterns | ABC formes, trou au milieu, 4 choix |

Paramètres communs : 5 manches par niveau (4 pour les tutoriels), seuils d'étoiles par défaut
(0 raté du premier coup = 3 étoiles, 1 raté = 2 étoiles, sinon 1).

**À observer dans les statistiques** : un taux de réussite au premier coup sous 50 % sur deux parties signale une marche trop haute.
Deux corrections possibles : ajouter un niveau intermédiaire (du JSON) ou rebloquer temporairement le niveau depuis l'espace parent.
