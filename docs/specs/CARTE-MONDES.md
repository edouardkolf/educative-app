# Carte : refonte des quatre mondes (novembre 2026)

Demande du PM : rendre chaque monde de la carte plus attrayant, avec la progression ; la montagne ne lui
plaisait pas. Le dernier monde doit finir sur une **vraie fin de chemin**, pas sur une coupure. La règle
« le même sentier de terre dans tous les mondes » est **supprimée** : chaque monde a le chemin qui lui va.

## Constat

Un monde, c'était une couleur de sol et des petits dessins semés au hasard, avec la même densité du premier
au vingtième niveau. On fait défiler 20 niveaux, chaque écran ressemble au précédent : rien de plus gros
qu'un arbre, aucun lieu, rien qui dise qu'on avance. La montagne copiait la forêt sur ses 17 premiers niveaux.

## Principes (communs aux quatre mondes)

1. **Un trajet en étapes** : le sol, la végétation et la lumière changent au fil du monde (de bas en haut).
   On lit l'étape à l'altitude dans la bande : `t = altitude(band, y)`, 0 au pied, 1 en haut.
2. **Deux à quatre grands lieux par monde**, bien plus gros que le reste (100 à 200 px), qui servent de
   repères et de destinations. Ils sont placés avec `findSpot` (layout.ts) pour ne jamais mordre sur le
   chemin ni sur un niveau ; ils peuvent déborder du bord de l'écran (jusqu'à un tiers de leur largeur).
3. **Des masses plutôt que du semis** : bosquets, clairières, bancs de nuages, rangées de sapins qui font
   couloir. Le petit décor (placeDecor) dépend de la zone (`kindsAt`) et évite les lieux (`avoid`).
4. **Rien sur le chemin ni sur les niveaux** (disques de 80 px, étoiles comprises) ni sur le panneau d'entrée
   `ctx.sign`. Les niveaux sont en HTML par-dessus la carte : un dessin sous un niveau est caché et brouille.
5. **Lisible pour une enfant de 4 ans** : contrastes francs entre le chemin et le sol, formes simples,
   pas de détail minuscule qui fait bruit. Même palette douce que le reste de l'app.

## Architecture (contrat)

- `src/screens/map/scenery/types.ts` : `SceneContext` (tout ce qu'un monde sait de sa bande) et
  `WorldScene` (ce qu'il dessine). **Contrat figé** pour les agents.
- `src/screens/map/scenery/<monde>.tsx` : un module par monde (`forest`, `sea`, `mountain`, `clouds`).
  Chacun dessine : `Ground` (sous le chemin), `Path` (découpé à la bande par l'assemblage), `Border` et
  `Passage` (sa frontière d'arrivée, en bas de sa bande), `Above` (lieux et décor), `End` (destination, si
  le parcours finit chez lui), `Backdrop` (fond des parties de ce monde), `footprints` (emprises des lieux,
  vérifiées par `scenery.test.ts`).
- `src/screens/map/scenery/common.tsx` : pièces partagées (sentier de terre `EarthPath` + `bandStones`,
  `Sprite`, `DecorLayer`, `FlatGround`, `SpriteBackdrop`, `WorldSign`, outils de tracé). Un monde peut s'en
  servir, mais ne le modifie pas : il dessine ses propres pièces dans son module.
- `src/screens/map/MapScenery.tsx` : l'assemblage. Ordre des calques : sols → frontières → chemins →
  ouvrages des frontières → lieux et décor (bande du haut d'abord) → panneaux → destination.
- `layout.ts` : géométrie (niveaux, chemin, bandes, passages, montagne) et `findSpot`, `clearOfRoute`,
  `overlaps`, `placeDecor(…, kindsAt, avoid)`. Le chemin ne sort plus par le haut : il monte de `END_RISE`
  au-dessus du dernier niveau jusqu'à `trackEnd()`, avec `END_ROOM` de place au-dessus pour la destination
  (sauf si le parcours finit en montagne : il finit alors à la pointe, avec le fanion).

Frontières (dessinées par le monde d'arrivée) : forêt → mer : plage et ponton (mer) ; mer → montagne :
crête et col (montagne) ; montagne → nuages : mer de nuages et échelle (nuages) ; nuages → forêt (quand
le parcours reboucle, jamais avec 80 niveaux) : rivière et pont (forêt).

## Règles techniques

- **Déterministe** : `hash01`, `createRng` à graine fixe ; jamais `Math.random`. Même carte à chaque visite.
- **Toutes tailles** : largeur 360 à 430 px ; parcours de 20 à 80 niveaux (le dernier monde peut être
  incomplet : un monde de 7 niveaux doit rester beau). Bande d'un monde complet : ≈ 3 450 px de haut.
- **Performance** (téléphone Android d'entrée de gamme, SVG de ≈ 14 000 px) : pas de filtre, de flou ni de
  masque ; dégradés `linearGradient` en `userSpaceOnUse` permis ; viser < 1 200 éléments SVG par monde ;
  utiliser `<defs>` + `<use>` pour les dessins répétés. **Pas d'animation** à ce stade (étape 2).
- **Identifiants SVG uniques dans la page** : préfixe `${monde}-${band.worldIndex}-` sur la carte,
  `bd-${monde}-` dans un fond de partie.
- Commentaires en français, rares et utiles ; identifiants en anglais.

## Les quatre mondes

Maquettes validées par le PM (9 niveaux compressés sur 1 500 px ; la carte réelle a 20 niveaux sur
≈ 3 450 px, donc chaque étape y est ≈ 2,3 fois plus longue) : voir les images de référence fournies aux
agents. Les dessins des maquettes peuvent être repris tels quels.

### Forêt — de la lisière au cœur du bois

- t 0 → 0,3 **la lisière** : sol vert tendre, prairie fleurie, papillons, un lapin ; barrière de bois au départ.
- t 0,3 → 0,65 **la clairière** : grande clairière plus claire, une **mare** (canard, roseaux, nénuphars) et
  un **ruisseau** qui en part, traverse le chemin sous un **petit pont de bois** et file vers le bord ; des
  bosquets d'arbres ronds.
- t 0,65 → 1 **le sous-bois** : le sol s'assombrit, les sapins se serrent sur les bords et font couloir au
  chemin, rayons de lumière, champignons, lucioles. Lieu phare : le **grand arbre-maison** (porte, fenêtre
  ronde, chouette sur une branche).
- Chemin : sentier de terre (`EarthPath`).

### Mer — d'île en île

- L'eau fonce en montant : lagon clair et turquoise en bas, bleu profond du large en haut.
- Le chemin devient un **ponton de bois** posé sur l'eau ; il relie de **vraies îles de sable**, où il redevient
  un sentier de sable. Des îles englobent des groupes de niveaux ; un halo de lagon clair les entoure.
- La vie marine est **sous l'eau**, en silhouettes bleu foncé : bancs de poissons, tortue, récif de corail ;
  plus de poissons orange posés à la surface ni de cailloux gris semés.
- Lieux : **phare** sur une île (faisceau lumineux), **coffre au trésor** sur une île, **baleine** qui souffle au
  large, voilier ; vaguelettes blanches, mouettes ; un poisson qui saute.
- En haut, les falaises de la montagne (dessinées par la montagne, frontière d'arrivée).

### Montagne — l'ascension

Le défaut à corriger : la montagne n'apparaissait qu'aux trois derniers niveaux. Désormais, **quatre étages**
du pied au sommet, sur toute la bande :

- t 0 → 0,3 **l'alpage** : herbe claire, fleurs, **vaches à cloche**, **chalet** avec sa fumée, quelques feuillus.
- t 0,3 → 0,55 **la forêt de sapins** : vert plus soutenu, sapins serrés ; un **torrent** descend d'en haut, fait
  une **cascade** dans une vasque, traverse le chemin sous un **pont de pierre**.
- t 0,55 → 0,8 **le pierrier** : sol gris-beige, dalles et éboulis, rochers anguleux, **bouquetin**, **marmotte**,
  plaques de neige.
- t 0,8 → 1 **la neige** : tout blanc, sapins enneigés, **bonhomme de neige**, **refuge**.
- Fond : chaînes lointaines en **bleu de distance** (plus en vert) avec des calottes de neige, ciel en
  dégradé, un aigle, des nuages. La grande montagne garde sa silhouette (mountainShape).
- Chemin : sentier de terre jusqu'à la pointe ; au sommet, l'échelle (nuages) ou le fanion (fin de parcours).

### Nuages — du jour à la nuit

- Le ciel change en montant : **jour** (bleu) → **coucher de soleil** (pêche, rose) → **nuit** (violet puis
  bleu nuit). Les nuages prennent la teinte de leur étape ; oiseaux de jour seulement, étoiles de nuit
  seulement. Le chemin de nuages reste très lisible sur chaque teinte.
- Lieux : un **grand arc-en-ciel** sous lequel passe le chemin (pieds posés sur des nuages), une
  **montgolfière**, le **soleil couchant** ; la nuit, la **lune**, une étoile filante, une **fusée**.
- **Fin du parcours** : le chemin s'arrête à la porte du **château de nuages** (au point `ctx.end`, avec
  `END_ROOM` de place au-dessus), avec un fanion au sommet : une destination, pas une coupure.

## Vérifier

- `npx vitest run src/screens/map` (dont `scenery.test.ts` : emprises des lieux, déterminisme, fin de chemin).
- `npm run preview:map -- <dossier> [--count=80] [--width=412] [--worlds=sea]` : trois tranches par monde
  (`<monde>-1.png` en bas … `-3.png` en haut, à l'échelle réelle, niveaux en disques numérotés) et
  `backdrops.png`. À regarder aussi en `--width=360` et avec un dernier monde incomplet (`--count=67`).

## Étape 2 (plus tard)

Un peu de mouvement, limité aux lieux et à ce qui est à l'écran : canard qui dérive, lucioles, jet de la
baleine, faisceau du phare, cascade, fumée du chalet, nuages qui dérivent, étoiles qui scintillent.
