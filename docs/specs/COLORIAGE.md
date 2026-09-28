# Coloriage magique (MS) — spécification

Cadre commun : [README.md](README.md), qui fait foi. Hub, routes, session et stockage v2 : [HUB.md](HUB.md).
Code réutilisé : le constructeur (`src/mechanics/builder/`), le labo des couleurs (`src/mechanics/color-mix/`), `src/ui/`.

## 1. Résumé

Le coloriage magique est un jeu illimité de moyenne section, hors parcours, ouvert depuis le hub (`#/coloring`).
Chaque dessin est une page de cahier de coloriage (contours sombres, cases blanches) : une figure du constructeur dans
un décor. Chaque case porte un code : une goutte, puis un objet, puis un symbole à lire dans une légende. L'enfant
prépare la couleur dans le récipient du labo avec trois fioles primaires (deux gouttes au plus, soit 6 couleurs), puis
tape la case. Le dessin terminé prend vie et rejoint le frigo. Il n'y a ni vies, ni étoiles, ni cadenas.

**Décisions du PM (28/09/2026), telles quelles** : « Pour la maternelle, un jeu de coloriage type coloriage magique.
Il faut mettre la bonne couleur dans la case et elle n'a que les couleurs primaires mais elle peut mélanger dans un
petit récipient jusqu'à 2 couleurs. » Le jeu est illimité (ni vies, ni étoiles de carte, ni cadenas), accessible depuis
le hub, pour 15 min par jour en semaine. L'enfant a « accroché au jeu des couleurs » (le labo : 14 manches, 6 recettes)
et « elle adore aussi les formes qui assemblées font la fusée, le château, etc. » (le constructeur).

**Décisions structurantes de cette spec**
1. Le petit récipient est l'Erlenmeyer du labo, avec les trois mêmes fioles : le geste appris au labo sert tel quel.
   La peinture reste dans le récipient. Une 3e fiole le rince et recommence ; taper le récipient le rince aussi.
2. Le code magique a 4 paliers, franchis automatiquement : goutte, objet gris, formes avec légende, dé avec légende.
   Le dessin s'enrichit en même temps : environ 6, puis 10, puis 14 cases.
3. 12 dessins en V1 : les 9 figures, plus 3 scènes à deux figures. Les couleurs des cases sont tirées par variante, et
   la légende change à chaque dessin.
4. Un dessin peut s'étaler sur plusieurs séances : interrompu par la lune, il est repris tel quel, dans une nouvelle
   partie liée à la précédente (cadre A2).
5. La récompense est déterministe : le dessin prend vie (animations de fin du constructeur), puis s'aimante au frigo.

## 2. Parcours de l'enfant

### 2.1 Entrée
Le picto coloriage du hub ouvre `#/coloring`. L'écran lit les coloriages de l'enfant (`listColorings`) :

| Situation | Écran affiché |
|---|---|
| Aucun coloriage enregistré | `house` au palier courant, en couleurs naturelles (`palette[0]`), avec le tutoriel (§2.6), sans écran de choix |
| Le dernier coloriage est reprenable (§3.6), arrêté par `time-up` ou `closed` | Reprise directe : les cases déjà peintes, le récipient vide |
| Le dernier coloriage est reprenable, arrêté par `quit` | Écran de choix, avec ce dessin (à moitié peint) en 1re carte |
| Autre cas | Écran de choix |

### 2.2 Écran de choix
Barre du haut : un bouton maison (56 px, `data-testid="to-hub"`) vers le hub, un bouton frigo (56 px,
`data-testid="coloring-fridge"`). Au centre, trois cartes d'au moins 128 px montrent la vignette du dessin au trait,
sans codes, au niveau de détail du palier (`data-choice="pick-<id>"`). La carte de reprise montre ses cases peintes
(`pick-resume`). Au tap, la carte grandit jusqu'à la place du dessin (300 ms, `playTap`), puis l'écran de peinture
s'affiche. Aucun enregistrement n'est créé avant la première peinture posée.

### 2.3 Écran de peinture
En portrait, sans défilement, du 360×640 au Pixel 7 :
```
[maison 56]            [légende, paliers 3-4]            [frigo 56]
[                 dessin carré sur une feuille blanche                 ]
[fiole rouge] [fiole jaune]     [récipient]     [fiole bleue]
```
- Dessin : côté = min(largeur − 24 px, 440 px, hauteur restante), **au moins 300 px à 360×640** (`WORST_DRAWING_PX`).
  Contours en `var(--ink)`, de 3 px (`vector-effect: non-scaling-stroke`). Cases à peindre et blancs en `#ffffff`,
  cases peintes en `COLOR_HEX` (`src/ui/palette.ts`).
- Fioles : le `Flask` du labo (≥ 72 px, `data-choice="red|yellow|blue"`), placées comme au labo : rouge et jaune à
  gauche, bleu à droite. Récipient : l'`Erlenmeyer` du labo en réduit (≥ 88 × 100 px), `data-choice="cup"`. Il porte
  `data-drops="red,yellow"` et `data-paint="orange|none"`, invisibles, pour les tests.
- Code de chaque case non peinte : il est centré sur l'ancre de la case, avec un diamètre de 10 % du dessin (≥ 30 px),
  sur un calque HTML au-dessus du SVG. Il porte `data-choice="zone-<id>"`, `data-target="<couleur>"` et
  `data-recipe="red,yellow"`, comme `data-mix-recipe` au labo.
- Légende (paliers 3 et 4) : une entrée par couleur du dessin, dans l'ordre de `COLORS`, avec le symbole au trait
  au-dessus d'une goutte `TargetDrop`. Hauteur ≥ 40 px, non tapable, `data-choice="legend-<couleur>"`.

| Geste | Effet | Son (`src/ui/sound.ts`) | Animation |
|---|---|---|---|
| Fiole, récipient à 0 ou 1 goutte | +1 goutte | `playPour` | une goutte tombe (comme `.cmx-drop`) ; le liquide est à mi-hauteur, puis plein |
| 2e goutte | mélange | `playBubble` | tourbillon et bulles pendant 600 ms (`MIX_MS`), puis la couleur obtenue |
| Fiole, récipient plein | rinçage, puis +1 goutte | `playDrain`, puis `playPour` | vidange de 400 ms (`DRAIN_MS`), puis la goutte |
| Tap sur le récipient | rinçage | `playDrain` | vidange de 400 ms |
| Case, bonne couleur | case peinte, définitivement | `playDing` | la couleur se répand depuis le point touché (350 ms) ; le code s'efface |
| Case, mauvaise couleur | la peinture ne prend pas | `playBoing` | la couleur paraît à 60 %, coule et s'efface (450 ms) ; la case tremble |
| Case, récipient vide | rien | `playTap` | les trois fioles pulsent deux fois (`cmx-pulse`) |
| Glisser depuis le récipient | alternative au tap | comme au tap | une goutte suit le doigt, 36 px au-dessus. Relâchée sur une case, elle vaut un tap à sa position ; ailleurs, elle revient (300 ms) |

Taps ignorés, sans son : fioles et récipient pendant une vidange ou un mélange, cases pendant un mélange, tout l'écran
pendant la fin de dessin. Une case peinte, un blanc ou un trait ne réagissent pas.

### 2.4 Fin de dessin
Quand la dernière case est peinte, l'enregistrement passe `completed`. Suit une séquence de 4 s environ, identique à
chaque dessin :
1. 0 ms : étincelles du constructeur (même balisage `.bld-magic__spark` que `BuilderView`, 10 angles) et `playFanfare`.
2. De 400 à 2 600 ms, le dessin prend vie. Chaque sujet joue l'animation de fin de sa figure
   (`FIGURES[id].endAnimation`). `pop` et `hop` réutilisent les keyframes `bld-figure-pop` et `bld-figure-hop`.
   `slide-*` devient un aller-retour `clr-trip-*` : la voiture sort à droite et revient par la gauche, la fusée décolle
   puis redescend, le poisson nage puis revient. Le décor s'anime (`life`) et les calques `endOnly` apparaissent :
   fumée, flammes, bulles.
3. 2 800 ms : la feuille rétrécit et vole jusqu'au bouton frigo (700 ms). `playStar` joue à l'arrivée et le frigo rebondit.
4. 3 600 ms : écran de choix.

### 2.5 Le frigo
Le frigo s'ouvre par son bouton (picto dessiné `FridgeIcon`), depuis l'écran de choix ou de peinture. Il remplace
l'écran : une porte de frigo, en grille 3 × 4 sans défilement, montre les 12 derniers dessins terminés, en couleurs,
chacun tenu par un aimant (`data-testid="fridge-item"`). Un tap sur un dessin l'agrandit et rejoue sa prise de vie
(étape 2) ; un nouveau tap, ou le bouton frigo, ramène à l'écran précédent. Il n'y a ni texte ni nombre.
Les dessins plus anciens restent dans les statistiques.

### 2.6 Tutoriel et aides
- Au premier dessin de l'enfant, `TutorialHand` montre `[A, B, zone-<id>]`, avec `[A, B] = recipeFor(cible)` pour la
  première case (dans l'ordre du dessin) dont la cible est secondaire. La main disparaît au premier tap de l'enfant
  (fiole, récipient ou case), comme `hasTapped` dans `LevelPlayer`.
- Au premier dessin du palier 3, quand la légende apparaît, la main montre `[zone-<id>, legend-<couleur>, A, B,
  zone-<id>]`. Elle passe par l'entrée de légende sans effet.
- Aide graduée, selon le nombre d'essais ratés sur la case (séances précédentes comprises), par `helpFor` :
  - palier 1 : la main de la recette apparaît après 2 erreurs ;
  - paliers 2 à 4 : un indice du code après 2 erreurs, puis la main de la recette après 3 erreurs.

  L'indice dure 2,5 s. Au palier 2, l'objet gris reprend sa couleur ; aux paliers 3 et 4, l'entrée de légende et le
  code de la case pulsent ensemble. La main de la recette montre `['cup', A, B, zone]` si le récipient n'est pas vide,
  sinon `[A, B, zone]`. Elle disparaît au tap suivant et revient après une nouvelle erreur sur cette case.

### 2.7 Sortie
La maison ramène au hub. Si une peinture a déjà été posée, la partie passe `abandoned`, avec la raison `exitReason()`
de `useSoftEnd` (`quit`, ou `time-up` si le temps est écoulé) ; si toutes les cases sont peintes, elle passe
`completed`. Le retour Android et le démontage de l'écran font de même (nettoyage au démontage, comme `LevelPlayer`).
Fin de séance : voir §6.2.

## 3. Règles

### 3.1 Le récipient (logique pure, `cup.ts`)
- État : `drops` (0, 1 ou 2 couleurs primaires, dans l'ordre de versement) et `used`.
- **R1**, `paintOf` : sans goutte, pas de peinture ; avec 1 goutte P, la peinture est P ; avec 2 gouttes, c'est
  `mixColors(a, b)` (`color-mix/generate.ts`). Deux fois la même fiole donne la primaire ; deux fioles différentes
  donnent orange, vert ou violet. Il y a donc 6 couleurs.
- **R2** : une fiole tapée sur un récipient à 0 ou 1 goutte ajoute sa goutte, et `used` repasse à faux.
- **R3** : une fiole tapée sur un récipient plein le rince d'abord, puis y met sa goutte seule (`drops = [P]`). Le
  récipient n'est jamais bloqué : toute couleur s'obtient en 3 taps au plus, depuis n'importe quel état.
- **R4** : un tap sur le récipient (déplacement < 10 px) le rince. S'il est déjà vide, rien ne se passe.
- **R5** : la peinture reste dans le récipient après chaque case, qu'elle ait pris ou non : on peint à la suite toutes
  les cases d'une couleur. `used` passe à vrai à la première application. Une application est **fraîche** (`fresh`)
  si c'est la première depuis le dernier versement.

Justification : préparer la couleur pour chaque case coûterait 3 taps par case et rendrait le jeu fastidieux. La
recette reste très pratiquée : 4 à 6 mélanges par dessin, 25 à 40 par séance, contre 5 dans un niveau du labo.

### 3.2 Peindre une case
- Un tap (ou la dépose d'une goutte glissée) est converti dans le repère 100 × 100 :
  `x = (clientX − rect.left) / rect.width × 100`, et de même pour `y`.
- `resolveTap(point, layers, painted, pxPerUnit)` est une fonction pure (`geometry.ts`), où `pxPerUnit` = largeur du
  dessin / 100 :
  1. elle cherche d'abord, parmi les cases **non peintes**, celle dont l'ancre est la plus proche du point, si elle est à
     moins de `HIT_RADIUS_PX = 36` px. Chaque case a ainsi un disque tapable de 72 px centré sur son code (§9 de
     l'architecture), même si elle est plus petite (fenêtre, porte), comme les emplacements agrandis du constructeur ;
  2. sinon, elle prend le calque le plus haut qui contient le point, les traits d'encre exclus. Si c'est une case non
     peinte, elle la renvoie ; si c'est un blanc, une case peinte ou rien, elle renvoie `null`.
- Case trouvée et récipient vide : aucun essai (voir §2.3). Peinture = cible : la case est peinte. Sinon, l'essai est
  raté, la case reste blanche et le récipient garde sa peinture : elle est juste, mais pas pour cette case.
  `null` : rien ne se passe.

### 3.3 Essais et premier coup
- Un **essai** est une application de peinture sur une case (`PaintAttempt`). Un tap avec le récipient vide, ou sur
  une case peinte, n'est pas un essai.
- Une case est **réussie du premier coup** si son premier essai a la bonne couleur. Une erreur ne coûte rien : il n'y
  a pas de vies. Chaque essai enregistre `help`, l'aide déjà montrée pour la case : 0 aucune, 1 indice, 2 main.

### 3.4 Paliers du code magique

| Palier | Code dans la case | Légende | Détail | Cases | Couleurs : min. distinctes / min. secondaires |
|---|---|---|---|---|---|
| 1 Goutte | goutte de la couleur cible (`TargetDrop`) | non | 1 | 6 à 9 | 3 / 1 |
| 2 Objet | objet du labo en gris (🍎 🍌 🫐 🥕 🐸 🍇, `grayscale(1)`) : se souvenir de sa couleur | non | 2 | 9 à 13 | 4 / 2 |
| 3 Formes | forme au trait parmi `SHAPES` : rond, carré, triangle, étoile, cœur, losange | symbole → goutte | 2 | 9 à 13 | 4 / 2 |
| 4 Dé | constellation 1 à 6 (`dotPositions`, `count/generate.ts`) | constellation → goutte | 3 | 12 à 17 | 5 / 3 |

- Justification :
  - le palier 1 reprend exactement le labo, où la couleur à obtenir est montrée ;
  - le palier 2 demande de se souvenir d'une connaissance (la carotte est orange), avec les objets révélés au labo ;
  - les paliers 3 et 4 sont le vrai coloriage magique, un exercice de codage au programme du cycle 1 ;
  - le dé relie le jeu aux constellations de « compter ».

  Au-delà du palier 1, aucun code n'est en couleur : sinon, on décoderait sans lire la légende.
- Le passage est automatique, sans texte. `autoTier` est recalculé à partir des enregistrements, comme
  `computeLevelStates`. On part du palier 1 et on parcourt les dessins terminés dans l'ordre de fin ; les cases d'un
  dessin sont celles de toute sa chaîne de parties (§3.6). Seuls comptent ceux joués au palier courant depuis qu'on y
  est arrivé :
  - **montée** après 3 dessins, si la réussite du premier coup, cumulée sur les cases des 3 derniers, atteint 80 % ;
  - **descente** après 2 dessins, si elle reste sous 50 % sur les 2 derniers (jamais sous le palier 1).

  Chaque changement remet ce compte à zéro. L'enfant voit la montée sans texte : le dessin suivant est plus riche et,
  au palier 3, la main montre la légende.
- Réglage parent `Profile.gameSettings.coloring.tier` (1 à 4 ; absent = automatique, cadre A6) : il force le palier.
  Les dessins joués à un autre palier que le palier automatique ne comptent pas dans son calcul.

### 3.5 Variantes, légende et ordre des dessins
- **Variante** (`assignColors(drawing, detail, tier, seed)`, dans `variants.ts`) : elle tire une couleur par case dans
  sa `palette`. Les cases d'une même `pair` ont la même couleur, `differentFrom` est respecté (les ids absents à ce
  niveau sont ignorés) et les minimums du palier sont atteints. La fonction fait jusqu'à 200 tirages avec
  `createRng(seed)` et garde le premier valide ; si aucun ne l'est, elle revient à `palette[0]`. Le résultat est figé
  dans l'enregistrement (`zones`).
- **Graine** (`nextVariantSeed`) : le plus petit `k ≥ 0` pour lequel `fnv1a(profileId|drawingId|k)` donne une
  signature différente des 5 dernières de ce dessin, au même niveau de détail. La signature est la suite des couleurs
  dans l'ordre des cases. Le tutoriel utilise les couleurs naturelles.
- **Légende** (`legendFor(couleurs, tier, seed)`) : au palier 3, `SHAPES` est mélangé ; au palier 4, ce sont les faces 1
  à 6. Chaque couleur du dessin reçoit un symbole distinct, figé dans l'enregistrement. La légende change d'un dessin à
  l'autre : il faut la relire à chaque fois.
- **Ordre** (`proposeDrawings(runs, ids, seed)`) : trois dessins distincts.
  1. Le favori : le dessin terminé le plus souvent, au moins 2 fois.
  2. et 3. Les moins récemment terminés : d'abord ceux jamais terminés, puis départage par mélange avec graine.

  Le dernier dessin terminé n'est jamais proposé. Le hasard porte sur le contenu, jamais sur une récompense.

### 3.6 Reprise
- Une partie est **reprenable** si c'est la dernière de l'enfant (le plus récent `startedAt`), qu'elle est `abandoned`
  (ou `in_progress`, cas d'un import), qu'il reste au moins une case non peinte, et que le dessin existe encore au
  catalogue avec exactement les mêmes ids de cases au niveau `detail` enregistré.
- Arrêtée par `time-up` ou `closed`, elle est reprise directement (« on finira demain »). Arrêtée par `quit`, elle est
  proposée en 1re carte, une seule fois : si l'enfant choisit un autre dessin et y peint, celui-ci devient le dernier.
- **Une partie close ne se rouvre jamais** (cadre A2). À l'écran, la reprise restaure le dessin, le palier, le détail,
  les couleurs, la légende, les cases peintes et les erreurs par case (pour les aides). À la première case peinte,
  `startColoring` crée une **nouvelle** partie, avec `resumedFrom` = l'id de la précédente, le tirage figé recopié,
  `paintedAtStart` et `missesAtStart`. Chaque partie se lit donc seule. Le récipient repart vide et le tutoriel n'est
  pas remontré.
- Une **chaîne** est la suite des parties d'un même dessin, reliées par `resumedFrom`. Les indicateurs « par dessin »
  se calculent sur les chaînes (§5.4).

## 4. Données et contenu

### 4.1 Modèle (`src/games/coloring/model.ts`, CONTRAT local)
```ts
import type { Color, FigureId, Shape } from '../../engine/types';
import type { EndAnimation } from '../../mechanics/builder/figures';
import type { ColoringTier } from '../../storage/colorings';

/** Repère 100 × 100, origine en haut à gauche, comme les figures du constructeur. */
export type Primitive =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number } // (x, y) = coin haut-gauche
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: [number, number][] }; // triangles, toits, vagues en ligne brisée
export type Detail = 1 | 2 | 3;
export type LifeAnimation = 'pulse' | 'drift' | 'bob' | 'sway' | 'twinkle';
interface LayerBase {
  shape: Primitive[]; // union : nuage = ellipse + cercles ; contour extérieur seul (trait, puis remplissage par-dessus)
  detail: Detail; // présent à partir de ce niveau de détail
  life?: LifeAnimation; // mouvement quand le dessin prend vie
  piece?: true; // pièce de la figure : une par emplacement de FIGURES[figure].slots
}
export interface ZoneLayer extends LayerBase {
  kind: 'zone';
  id: string; // stable : clé des enregistrements
  anchor: { x: number; y: number }; // centre du code magique
  palette: Color[]; // couleurs possibles ; palette[0] = couleur naturelle
  pair?: string; // cases jumelles, toujours de la même couleur (roues, fenêtres)
  differentFrom?: string[]; // voisines jamais de la même couleur (toit et ciel)
}
export interface BlankLayer extends LayerBase { kind: 'blank'; endOnly?: true } // reste blanc (nuage, neige, voile)
export interface InkLayer { kind: 'ink'; d: string; detail: Detail; filled?: true; life?: LifeAnimation; endOnly?: true }
export type Layer = ZoneLayer | BlankLayer | InkLayer; // ordre du tableau = ordre de peinture (fond d'abord)
export interface Subject { figure: FigureId; endAnimation: EndAnimation; layers: Layer[] }
export interface Drawing { id: string; background: Layer[]; subjects: [Subject] | [Subject, Subject]; foreground?: Layer[] }
export type CodeSymbol = Shape | `dice-${1 | 2 | 3 | 4 | 5 | 6}`;

export const DETAIL_FOR_TIER: Record<ColoringTier, Detail> = { 1: 1, 2: 2, 3: 2, 4: 3 };
export const ZONES_PER_DETAIL: Record<Detail, [number, number]> = { 1: [6, 9], 2: [9, 13], 3: [12, 17] };
export const ANCHOR_R = 5.5; // disque du code, en unités (≥ 33 px au pire)
export const MIN_ANCHOR_GAP = 12; // entre deux ancres : 36 px au pire, le rayon tapable
export const HIT_RADIUS_PX = 36;
export const WORST_DRAWING_PX = 300;
```
Les blancs occultent : un tap sur un nuage devant le ciel ne peint pas le ciel. L'encre (yeux, rayons, tirets de route)
n'est jamais tapable et laisse passer le tap à la case du dessous. `endOnly` n'existe que sur les blancs et l'encre.
Pourquoi des primitives plutôt que des chemins SVG libres : le test « point dans la case » reste pur et testable
(Vitest, sans DOM), et la même résolution sert au tap, au glisser et aux tests du catalogue.

### 4.2 Règles d'un dessin (vérifiées par `catalog.test.ts`, pour chaque dessin et chaque niveau de détail)
1. Ids de cases uniques dans le dessin ; toutes les coordonnées dans [0, 100] ; au moins un sujet.
2. Le disque d'ancre (rayon `ANCHOR_R`) est entièrement dans sa case (le centre et 16 points du cercle), et aucun
   calque plus haut ne le recouvre : le code est visible, et un tap sur le code touche la case.
3. Deux ancres sont toujours à au moins `MIN_ANCHOR_GAP` unités l'une de l'autre. Ainsi, le disque tapable d'une case
   ne contient jamais le code d'une autre (cf. le test du constructeur où « la porte volait les taps »).
4. Le nombre de cases est dans l'intervalle `ZONES_PER_DETAIL` du niveau.
5. La `palette` est non vide, sans doublon et incluse dans `COLORS`. Les cases d'une même `pair` ont la même palette.
   `differentFrom` ne cite que des ids du dessin, et les couleurs naturelles le respectent.
6. Pour chacun des 4 paliers et 40 graines, `assignColors` respecte le §3.5. Il produit au moins 6 affectations
   distinctes au niveau 1, et au moins 12 aux niveaux 2 et 3.
7. Pour chaque sujet, les calques `piece` (cases ou blancs) correspondent un à un aux emplacements de
   `FIGURES[figure].slots` : `rect` pour un carré ou un rectangle, `circle` pour un cercle, un polygone à 3 points pour
   un triangle. L'enfant reconnaît sa fusée du constructeur, et la variante « construire puis colorier » (§10) sera
   possible sans migration. Les proportions peuvent être adaptées au décor et à la règle 2 : les ailerons de la fusée
   (14 × 18) doivent par exemple grandir pour contenir le disque d'ancre.

### 4.3 Catalogue V1 : 12 dessins (`src/games/coloring/catalog/<id>.ts`, liste dans `catalog/index.ts`)

| id | Sujets (fin) | Niveau 1 | Ajouts niveau 2 | Ajouts niveau 3 |
|---|---|---|---|---|
| `house` | maison (`pop`) | ciel, soleil, herbe, mur, toit, porte | nuage blanc, cheminée, fenêtres ×2, allée | buissons ×2, fleurs ×2 ; fumée `endOnly` |
| `tree` | sapin (`pop`) | ciel de nuit, lune, feuillage, tronc, étoile, colline ; neige blanche | boules ×2, cadeaux ×2 | boules ×2, flocons (encre) |
| `boat` | bateau (`slide-right`) | ciel, soleil, mer, coque, voile, fanion | vague de devant, 2e voile blanche, hublots ×2 | poisson, bouée ; mouette (encre) |
| `car` | voiture (`slide-right`) | ciel, soleil, herbe, carrosserie, vitre, roues ×2 ; route blanche | phare, arbre (feuillage, tronc), nuage blanc | fleurs ×2, portière ; fumée `endOnly` |
| `rocket` | fusée (`slide-up`) | ciel de nuit, lune, corps, coiffe, ailerons ×2 | hublot, planète, étoiles ×2 | anneau, étoiles ×2 ; flammes `endOnly` |
| `fish` | poisson (`slide-left`) | eau, sable, corps, queue, nageoire, algue | algues ×2, coquillage, rayure | étoile de mer, caillou ×2 ; bulles `endOnly` |
| `robot` | robot (`hop`) | mur, sol, corps, tête, bras ×2 | jambes ×2, écran, antenne | tableau au mur, tapis, pieds ×2 |
| `snowman` | bonhomme de neige (`hop`), boules blanches | ciel, soleil, chapeau, écharpe, nez, sapin | ruban du chapeau, tronc, gants ×2 | oiseau, 2e sapin, colline |
| `castle` | château (`pop`) | ciel, colline, mur, tours ×2, porte | toits ×2, soleil, fenêtres ×2 | drapeaux ×2, chemin ; nuage blanc |
| `garden` | maison + sapin | 7 cases | +4 | +4 |
| `sea` | bateau en surface, poisson dessous | 7 cases | +4 | +4 |
| `space` | fusée + robot sur la lune | 7 cases | +4 | +4 |

### 4.4 Exemple de référence (`house`, géométrie validée par un script : 6, 10 puis 14 cases, règles 2 et 3)
```ts
export const house: Drawing = { // aides de catalog/build.ts : zone(id, formes, ancre, détail, palette, options)
  id: 'house',
  background: [
    zone('sky', [rect(0, 0, 100, 82)], { x: 88, y: 44 }, 1, ['blue']),
    zone('sun', [circle(15, 15, 10)], { x: 15, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    blank([ellipse(76, 15, 11, 6), circle(70, 11, 6), circle(80, 10, 7)], 2, { life: 'drift' }),
    zone('grass', [rect(0, 82, 100, 18)], { x: 10, y: 92 }, 1, ['green']),
  ],
  subjects: [{ figure: 'house', endAnimation: 'pop', layers: [
    zone('chimney', [rect(58, 12, 12, 22)], { x: 64, y: 20 }, 2, ['red', 'orange', 'purple'], { differentFrom: ['roof'] }),
    zone('roof', [poly([22, 48], [50, 22], [78, 48])], { x: 50, y: 37 }, 1, ['red', 'purple', 'orange'], { piece: true }),
    zone('wall', [rect(28, 48, 44, 34)], { x: 50, y: 54 }, 1, ['yellow', 'orange', 'red', 'blue', 'purple', 'green'],
      { piece: true, differentFrom: ['sky', 'roof', 'door', 'window-l'] }),
    zone('window-l', [rect(30.5, 53, 11, 11)], { x: 36, y: 58.5 }, 2, ['blue', 'yellow'], { pair: 'windows' }),
    zone('window-r', [rect(58.5, 53, 11, 11)], { x: 64, y: 58.5 }, 2, ['blue', 'yellow'], { pair: 'windows' }),
    zone('door', [rect(43, 62, 14, 20)], { x: 50, y: 72 }, 1, ['blue', 'green', 'purple', 'red', 'orange'], { piece: true }),
  ] }],
  foreground: [
    zone('path', [poly([43, 82], [57, 82], [62, 100], [38, 100])], { x: 50, y: 91 }, 2, ['yellow', 'orange'], { differentFrom: ['door'] }),
    zone('bush-l', [circle(19, 80, 7), circle(26, 83, 5)], { x: 19, y: 80 }, 3, ['green'], { pair: 'bushes', life: 'sway' }),
    zone('bush-r', [circle(81, 80, 7), circle(74, 83, 5)], { x: 81, y: 80 }, 3, ['green'], { pair: 'bushes', life: 'sway' }),
    zone('flower-l', [circle(29, 93, 6.5)], { x: 29, y: 93 }, 3, ['red', 'purple', 'orange', 'yellow'], { pair: 'flowers' }),
    zone('flower-r', [circle(71, 93, 6.5)], { x: 71, y: 93 }, 3, ['red', 'purple', 'orange', 'yellow'], { pair: 'flowers' }),
  ],
};
```

### 4.5 Ajouter un dessin
Pour ajouter un dessin, on crée `catalog/<id>.ts` avec les aides de `catalog/build.ts` (`rect`, `circle`, `ellipse`,
`poly`, `zone`, `blank`, `ink`), puis on l'ajoute à `DRAWINGS` dans `catalog/index.ts`. On lance ensuite `npm test` :
les règles du §4.2 disent quelle ancre corriger. Ce sont des données seulement : aucun écran, aucun stockage, aucune
migration. Il ne faut jamais renommer l'id d'une case publiée : un coloriage en cours ne serait plus reprenable (§7).

### 4.6 Durée et variété (chiffrage)
Modèle d'estimation, pour une enfant de 4 ans : 5 s par case, 3 s par mélange, 2 s de plus par case aux paliers 3 et 4
(lire la légende), 4 s de fin.

| Palier | Cases | Mélanges | Durée d'un dessin | Dessins en 15 min |
|---|---|---|---|---|
| 1 | 6 à 9 | 3-4 | environ 1 min | environ 12 (mais le palier dure 3 dessins) |
| 2 | 9 à 13 | 4-5 | environ 1,5 min | environ 9 |
| 3 | 9 à 13 | 4-6 | environ 2 min | environ 7 |
| 4 | 12 à 17 | 5-6 | 2,5 à 3 min | 5 ou 6 |

Une enfant qui connaît ses recettes atteint le palier 4 vers la 2e séance : c'est là qu'elle joue longtemps. Le
catalogue compte 12 dessins × 3 niveaux, soit 36 pages au trait distinctes. Chaque page a au moins 12 variantes de
couleurs, sans répétition sur ses 5 derniers passages, et sa légende change à chaque fois. Au palier 4, avec 25
dessins par semaine, un même dessin revient tous les 2 ou 3 jours, avec d'autres couleurs et une autre légende. Il
faut environ 5 semaines pour épuiser 5 variantes par dessin. Le risque de lassitude vient des silhouettes, qui se
répètent dès la 3e semaine. Pour y répondre :
- ajouter 1 ou 2 dessins par semaine (données seulement, environ 1 h chacun), pour viser 24 dessins à 2 mois ;
- en V1.1, la variante « construire puis colorier » double les façons de jouer chaque dessin ;
- surveiller le signal de lassitude : la part de `quit` et le temps de coloriage par jour, dans les statistiques.

## 5. Stockage et statistiques

### 5.1 Enregistrement (`src/storage/colorings.ts`, cadre A1)
```ts
import type { Color } from '../engine/types';
import type { GameRecordBase } from './types'; // id, profileId, startedAt, endedAt, status, endReason, activeMs (HUB.md §5.2)
export type ColoringTier = 1 | 2 | 3 | 4;
export interface ColoringSettings { tier?: ColoringTier } // Profile.gameSettings.coloring (cadre A6) ; absent = automatique
export interface PaintAttempt {
  zoneId: string;
  paint: Color; // couleur posée
  drops: Color[]; // gouttes qui l'ont produite : 1 ou 2 primaires, dans l'ordre (la recette utilisée)
  fresh: boolean; // première application de ce contenu du récipient (§3.1 R5)
  help: 0 | 1 | 2; // aide déjà montrée pour cette case
  at: number; // temps actif de la partie (ms) au moment de l'essai
}
export interface ColoringRecord extends GameRecordBase {
  // startedAt : première case peinte de la séance (cadre A9) ; activeMs : écran de peinture, page visible
  drawingId: string;
  tier: ColoringTier; detail: 1 | 2 | 3; variantSeed: number;
  zones: { id: string; target: Color }[]; // cases et couleurs attendues, figées au 1er lancement (ordre du dessin)
  legend: Partial<Record<Color, string>> | null; // paliers 3-4 : couleur → CodeSymbol
  attempts: PaintAttempt[]; // essais de CETTE partie
  resumedFrom?: string; // partie précédente du même dessin (reprise, §3.6)
  paintedAtStart: string[]; // cases déjà peintes au début de cette partie ([] pour un nouveau dessin)
  missesAtStart: Record<string, number>; // essais ratés par case avant cette partie ({} pour un nouveau dessin)
}
```
Dérivés, jamais stockés : case peinte (dans `paintedAtStart`, ou un essai avec `paint = target`), premier coup,
erreurs par case. L'enregistrement fait environ 1 ko par partie.

### 5.2 API (`src/storage/colorings.ts`, bâtie sur `game-records.ts` de HUB.md §5.2)
- `startColoring(profileId, init)` : `startGameRecord('colorings', …)` à la première case peinte de la séance, avec
  `attempts: []`. Pour une reprise, `init` porte `resumedFrom`, le tirage recopié, `paintedAtStart` et `missesAtStart`.
- `recordPaint(id, attempt, activeMs)` ajoute l'essai et met à jour `activeMs`.
- `completeColoring(id, activeMs)` et `abandonColoring(id, reason, activeMs)` : `finishGameRecord`.
- Ces trois fonctions n'agissent que sur une partie `in_progress`, comme `recordRound`. Il n'y a pas de
  `resumeColoring` : une partie close ne se rouvre jamais (§3.6).
- `listColorings(profileId)` renvoie les parties triées par `startedAt`. Elle utilise l'index `profileId`.
- `isColoringFinished(r)` : toutes les `zones` sont dans `paintedAtStart` ou peintes par un essai.

Les écritures d'une même partie passent par une file (promesse chaînée), pour garder l'ordre des essais.

### 5.3 Clôture et import
- La clôture au lancement est générique (`closeStaleGameRecords`, HUB.md §5.2, cadre A3). Elle se sert de
  `isColoringFinished` pour passer à `completed` un dessin fini dont l'écriture finale a manqué (comme F7 de
  `LevelPlayer`). Il n'y a pas de `closeStaleColorings`.
- `isColoringRecord(value)` valide une partie à l'import, sur le même modèle que `isRun`. Il vérifie :
  - qu'elle passe `isGameRecordBase` (ids, horodatages, `status`, `endReason`, `activeMs`) et que `drawingId` est non
    vide ;
  - que `tier` vaut de 1 à 4, `detail` de 1 à 3, et que `variantSeed` est un entier ;
  - que `resumedFrom` est absent ou non vide, que `paintedAtStart` ne cite que des cases de `zones`, sans doublon, et
    que `missesAtStart` n'a pour clés que des cases de `zones`, avec des entiers ≥ 0 ;
  - que `zones` est non vide, avec des ids uniques et des `target` dans `COLORS` ;
  - que `legend` vaut null, ou a des clés dans `COLORS` et des valeurs de chaîne non vides ;
  - que chaque essai a un `zoneId` présent dans `zones`, un `paint` dans `COLORS`, 1 ou 2 `drops` primaires,
    `paint` = la goutte seule ou `mixColors(drops)`, un `fresh` booléen, un `help` dans {0, 1, 2} et un `at` ≥ 0 ;
  - que les ids sont uniques entre parties de coloriage.

  Les lignes orphelines sont ignorées (HUB.md). `isColoringSettings` valide `gameSettings.coloring` : `tier` absent,
  ou de 1 à 4 (cadre A6).
- Un dessin disparu du catalogue n'invalide pas l'import. Les cibles étant figées, les statistiques restent justes.

### 5.4 Statistiques (bloc « Coloriage magique », pure : `summarizeColorings(records)` dans `stats.ts`)

Les indicateurs communs (parties, terminées, abandons, interruptions, temps de jeu, jours joués, dernière partie) sont
affichés par ChildStats et comptent des **séances** (HUB.md §5.5, cadre A8). Un dessin quitté puis repris et fini y
compte donc un abandon, comme un niveau quitté puis rejoué. Le bloc du coloriage compte, lui, des **dessins** (chaînes,
§3.6) :

| Indicateur | Définition exacte |
|---|---|
| Dessins commencés | Chaînes : parties sans `resumedFrom`. Un dessin naît à sa première case peinte. |
| Dessins terminés | Parties `completed` (une seule par chaîne, la dernière). |
| Dessins inachevés | Chaînes dont la dernière partie est `abandoned` : dessins laissés en plan, reprenables ou non. |
| Temps par dessin | Médiane, sur les dessins terminés, de Σ `activeMs` des parties de la chaîne. |
| Réussite du premier coup | Cases peintes dont le 1er essai de la chaîne a la bonne couleur / cases peintes. Une case jamais peinte ne compte pas, comme une manche non résolue (architecture §7). |
| Recette, par couleur (6 lignes) | Pour la couleur C : les essais frais sur des cases de cible C, et la part de ceux où `paint = C`. Affiché à partir de 5 essais, avec la confusion la plus fréquente (la couleur posée à tort, si elle revient ≥ 2 fois). |
| Palier | Le palier actuel, automatique ou fixé. Pour chaque palier joué : les dessins terminés et la réussite du premier coup. |
| Aide de la main | Cases dont l'essai réussi a `help = 2` / cases peintes. |

Lecture pour le parent (texte d'aide du bloc) : la ligne « recette » juge chaque nouveau mélange sur la première case
où il est posé. Un violet à 40 % quand l'orange est à 90 % signale une recette rouge + bleu non acquise ; la
confusion « vert » y montre que bleu + jaune et bleu + rouge sont mélangés. Aux paliers 3 et 4, une erreur peut aussi
venir de la lecture de la légende : comparer avec la réussite par palier. En tapant au hasard, on réussit environ 1
case sur 6.

## 6. Intégration

### 6.1 Route, hub, registre
- `#/coloring` affiche `ColoringScreen` (`src/games/coloring/ColoringScreen.tsx`). La route n'a pas de paramètre :
  l'écran décide seul entre reprise, choix et premier dessin (§2.1). Sans profil actif : garde de route (HUB.md).
- L'entrée `coloring` de `src/games/index.ts` (HUB.md §4.2) comprend le libellé parent « Coloriage magique » et le
  parcours par défaut `ms`. Le picto de la tuile est dessiné par le hub (`GameIcon`, HUB.md §2.1 : dessin à zones à
  moitié colorié, pinceau, gouttes rouge, jaune et bleue ; cadre A7).
- Dans l'écran, un état `phase` vaut `'loading' | 'choosing' | 'painting' | 'celebrating' | 'fridge'`. Il n'y a pas
  de sous-route : le retour Android quitte le jeu (§2.7).

### 6.2 Temps et fin douce
- L'horloge de session compte le temps sur `coloring` (cadre §3.3). Le temps actif du dessin (`activeMs`) se met en
  pause quand la page est cachée, comme F10 dans `LevelPlayer`.
- L'**unité en cours est la case en train d'être peinte**. L'écran utilise `useSoftEnd` (HUB.md §4.4, cadre A4) :
  - `busy` = phase `painting` tant qu'aucune case n'a été peinte depuis que le temps est écoulé, ou phase
    `celebrating` ;
  - `onTimeUp` = `abandonColoring(id, 'time-up', activeMs)` si une partie est ouverte et pas finie ;
  - `checkpoint()` est appelé au choix d'un dessin (et à la reprise), jamais avant d'enregistrer : la case commencée
    s'enregistre, quitte à créer la partie.

| Phase | Comportement |
|---|---|
| `painting` | L'enfant continue. La prochaine case peinte clôt l'unité, les essais ratés non. Si le dessin est alors fini, il passe par `celebrating`. Sinon, la fin douce s'enclenche (`onTimeUp`, puis écran de fin). Au bout de 60 s sans case peinte, même fin. Sans aucune partie ouverte, on ne fait que naviguer. |
| `celebrating` | Le dessin est déjà `completed`. L'écran de fin vient après la séquence (≤ 4 s), sans écran de choix. |
| `choosing`, `fridge` | Écran de fin immédiat. Rien n'est ouvert, rien n'est enregistré. |

- Sauvegardé à l'interruption : l'enregistrement complet (essais, `activeMs`, arrêt `time-up`). Non sauvegardé : le
  contenu du récipient et l'état des animations. La reprise suit le §3.6.

### 6.3 Espace parent
- `ColoringStats.tsx` (props `GameStatsProps<ColoringRecord>` de HUB.md §4.2, cadre A7) affiche le §5.4 avec les
  classes `pa-*` et `format.ts`, dont le palier actuel. ChildStats le monte (HUB.md §6.4).
- `ColoringSettings.tsx` (props `GameSettingsProps<ColoringSettings>`) est le réglage « Palier du code » de la fiche
  enfant, sous la bascule du coloriage (HUB.md §6.4). C'est un sélecteur segmenté comme « Déblocage » dans ChildStats :
  Automatique · Goutte · Objet · Formes · Dé. Il écrit `gameSettings.coloring.tier` (cadre A6).

### 6.4 Fichiers existants modifiés ou importés
- **Modifiés** :
  - `src/mechanics/color-mix/ColorMixView.tsx` : `Flask`, `Erlenmeyer`, `TargetDrop`, `DROP_D`, `OBJECT_FOR_COLOR`
    et les types de liquide passent dans le nouveau `parts.tsx`, exportés. Le DOM et le comportement sont inchangés :
    les e2e du labo servent de non-régression ;
  - `src/storage/colorings.ts` : la souche créée par T1 (HUB.md §5.2) reçoit les types du §5.1 et l'API du §5.2.
- **Importés sans modification** :
  - `FIGURES` et `EndAnimation` (`builder/figures.ts`) ;
  - `builder.css`, importé explicitement par `DrawingView.tsx` pour `bld-figure-pop`, `bld-figure-hop` et `.bld-magic` ;
  - `mixColors`, `recipeFor` et `PRIMARY_FLASKS` (`color-mix/generate.ts`), et `color-mix.css`. Les tailles réduites
    sont surchargées dans `coloring.css` ;
  - `dotPositions`, `TutorialHand`, `Emoji`, `IconButton`, `COLOR_HEX`, `createRng` et les sons.

  Les formes au trait des codes reprennent la géométrie de `shapeInner` (`src/ui/Shape.tsx` : `STAR_POINTS`,
  `HEART_PATH`), recopiée dans `CodeMark.tsx`, car `Shape` impose une couleur.
- **Via HUB.md** : `storage/types.ts`, `db.ts`, `export-import.ts`, `storage/index.ts`, `AppShell.tsx`,
  `SessionProvider.tsx` et `games/index.ts` (§12).

## 7. Cas limites
- **Catalogue modifié** (dessin supprimé, ou ids de cases changés) : le coloriage n'est pas reprenable et le frigo
  l'ignore. Les statistiques restent justes grâce aux cibles figées.
- **Palier forcé changé pendant une pause** : le dessin repris garde son palier. Le suivant prend le nouveau.
- **Écriture `completeColoring` en échec** : l'erreur est journalisée ; la clôture générique le passe à `completed`
  au lancement suivant (`isColoringFinished`).
- **Quitter pendant la fin de dessin** : le dessin est déjà `completed`, ce n'est pas un abandon.
- **Lune avant toute peinture** : l'unité est la première case (≤ 60 s). Si elle est peinte, l'enregistrement naît,
  puis se ferme en `time-up`.
- **Taps rapides** : ils sont ignorés pendant une vidange ou un mélange ; les écritures sont en file.
- **Plusieurs doigts** : seul le premier pointeur compte.
- **Glisser raté** : relâchée hors du dessin, la goutte revient. Avec un récipient vide, aucune goutte ne suit le
  doigt : le geste est un tap sur le récipient.
- **Import d'un coloriage `in_progress`** : il est reprenable tout de suite, et clôturé au lancement suivant.
- **Son coupé** : le jeu est inchangé. Avec `prefers-reduced-motion`, il n'y a ni remplissage progressif ni
  aller-retour, et les étincelles sont masquées ; la séquence de fin dure 1,2 s.
- **Catalogue de moins de 4 dessins** (tests) : moins de 3 cartes. **Profil ancien** sans `gameSettings` : palier
  automatique.
- **Profil supprimé pendant le jeu** : garde de route de HUB.md. Les écritures orphelines sont ignorées à l'export (F2).

## 8. Tests

**Unitaires (Vitest, à côté du code)**
- `geometry.test.ts` :
  - points dans chaque primitive (bords compris) et dans une union ;
  - priorité de l'ancre la plus proche dans le rayon, conversion px vers unités ;
  - case peinte ignorée à l'étape 1 et renvoyant `null` à l'étape 2 ;
  - blanc qui occulte, encre transparente, hors dessin donnant `null`.
- `cup.test.ts` : R1 à R5, les 9 suites de deux versements, la 3e fiole, le rinçage d'un récipient vide, `fresh`.
- `rules.test.ts` :
  - `applyPaint` (peinte, ratée, sans peinture, déjà peinte) ;
  - `helpFor` par palier ;
  - `isComplete` ;
  - `stateFromRecord` : reprise des cases peintes et des erreurs (dont `paintedAtStart` et `missesAtStart`).
- `variants.test.ts` : déterminisme par graine, règles du §3.5, `legendFor` (symboles distincts, 3 à 6 couleurs),
  `nextVariantSeed` (différent des 5 dernières). La règle 6 du catalogue s'applique au catalogue réel.
- `progression.test.ts` :
  - montée et descente de palier, remise à zéro, palier forcé ignoré par l'automatique ;
  - `proposeDrawings` : 3 distincts, sans le dernier, favori, jamais terminés d'abord ;
  - reprenable ou non (`time-up`, `closed`, `quit`, catalogue changé) ;
  - frigo : 12 derniers terminés.
- `catalog.test.ts` : règles 1 à 5 et 7 du §4.2, pour les 12 dessins × 3 niveaux.
- `stats.test.ts` : chaque ligne du §5.4 sur des cas construits (reprise, `fresh`, confusion, moins de 5 essais).
- `storage/colorings.test.ts` (`fake-indexeddb`) : cycle de vie, gardes `in_progress`, reprise (une nouvelle partie
  liée, la précédente inchangée), `isColoringFinished` (avec `paintedAtStart`), `isColoringRecord` (cas acceptés et
  refusés, dont `drops` incohérent avec `paint`). La clôture générique au lancement est testée par T1.

**Bout en bout (`tests/e2e/coloring.spec.ts`, Pixel 7, sans `console.error`, navigation par `tests/e2e/nav.ts`)** :
on résout avec `data-recipe` et `data-target`.
1. Premier coloriage : on passe du hub au coloriage. La main du tutoriel est visible. On peint tout le dessin, la fin
   se joue, le frigo contient 1 dessin, et le choix propose 3 cartes sans `house`.
2. Erreur douce : le code est toujours là et `data-paint` du récipient n'a pas changé ; ensuite, la bonne couleur prend.
3. Récipient : rouge, bleu, puis jaune donnent `data-drops="yellow"`. Un tap sur le récipient donne `none`.
4. Glisser : du récipient jusqu'à un code, la case est peinte.
5. Fin douce et reprise (`page.clock`) : on peint 2 cases, puis `runFor('15:05')`, puis 1 case. L'écran de fin
   s'affiche. Code parent, puis hub, puis coloriage : on retrouve le même dessin, avec 3 cases peintes. Après une case
   de plus, les statistiques montrent 2 parties et 1 interruption, mais 1 seul dessin commencé.
6. Petit téléphone (360×640) : aucun défilement ; dessin ≥ 300 px ; codes ≥ 28 px ; fioles ≥ 72 px ; boutons ≥ 56 px.
7. Sans texte : `innerText` de l'écran est vide sur le choix, la peinture et le frigo.
8. Parent : après un dessin, le bloc affiche `data-testid="coloring-stats-completed"` = 1. Le palier forcé dans la
   fiche enfant est pris en compte au dessin suivant (`data-tier`).

## 9. Découpage en tâches
Tous les fichiers sont dans `src/games/coloring/`, sauf mention contraire. Les tests sont à côté de leur fichier.

| Tâche | Fichiers | Dépend de |
|---|---|---|
| C0 Contrats (courte, d'abord) | `model.ts` ; les types du §5.1 dans `src/storage/colorings.ts` (souche de T1) | T1 |
| C1 Géométrie et catalogue | `geometry.ts`, `catalog/build.ts`, `catalog/index.ts`, `catalog/<id>.ts` ×12, `catalog/catalog.test.ts` | C0 |
| C2 Logique pure | `cup.ts`, `rules.ts`, `variants.ts`, `progression.ts` et leurs tests | C0 ; C1 pour le test sur le catalogue réel |
| C3 Vue du dessin et atelier | `src/mechanics/color-mix/parts.tsx` et `ColorMixView.tsx` (extraction), `DrawingView.tsx`, `Atelier.tsx`, `CodeMark.tsx`, `Legend.tsx`, `coloring.css` | C0, C1 (`resolveTap`), C2 (`cup`) |
| C4 Écran et cycle de partie | `ColoringScreen.tsx` (reprend la souche), `ChoiceBoard.tsx`, `Fridge.tsx`, `FridgeIcon.tsx`, `coloring-screen.css` | C2, C3, C5, T2 (route, fin douce) |
| C5 Stockage | `src/storage/colorings.ts` (API du §5.2, après C0) et son test | C0, T1 (store `colorings`) |
| C6 Statistiques et réglage parent | `stats.ts` et son test, `ColoringStats.tsx` et `ColoringSettings.tsx` (reprennent les souches) | C0, C2 (`currentTier`), T2 |
| C7 Bout en bout | `tests/e2e/coloring.spec.ts` | toutes, T3, T4 |

C1 et C2 peuvent démarrer en parallèle, les types du §4.1 et du §5.1 faisant foi. C3, C5 et C6 démarrent dès C0 :
ils codent contre les signatures du §3 et du §5.2, et leurs tests utilisent de petits dessins de test.

## 10. Questions ouvertes pour le PM
1. **« Construire puis colorier »**. Dans cette variante, les pièces du sujet (calques `piece`, blanches) sont d'abord
   posées comme au constructeur (`snap.ts`), puis le dessin est peint. *Avis* : c'est excellent pour l'envie de jouer,
   car cela relie ses deux jeux préférés, mais cela double les gestes à l'écran. *Recommandation* : la faire en V1.1,
   sur une carte sur trois de l'écran de choix, après une semaine d'observation de la V1. Le modèle est prêt (règle 7).
2. **Choix du dessin**. Faut-il 3 cartes, dont son favori, ou un enchaînement imposé ? *Recommandation* : 3 cartes,
   car c'est de l'autonomie pour une non-lectrice ; la rotation garde la variété.
3. **Palier 2 en objets gris** : 🫐 est peu connu. *Recommandation* : garder les objets du labo, qu'elle a vus, avec
   l'indice en couleur après 2 erreurs. Sinon, montrer les objets en couleur, mais le palier n'apprendrait presque rien.
4. **Rinçage par tap sur le récipient**. Il y a un risque de vidange involontaire. *Recommandation* : le garder et
   l'observer. Solution de repli : un « pot d'eau » à part, ou seulement la 3e fiole.
5. **Rétrogradation automatique de palier**. *Recommandation* : oui, douce (2 dessins sous 50 %). Le parent peut
   aussi fixer le palier.
6. **Frigo limité aux 12 derniers dessins**. *Recommandation* : oui en V1, un album complet en V2.
7. **Rythme d'ajout de dessins**. *Recommandation* : 1 ou 2 par semaine, pour 24 dessins à 2 mois (§4.6).

## 11. Hors périmètre / V2
- La variante « construire puis colorier » (V1.1, question 1).
- Un coloriage libre, où toute couleur prend.
- Des scènes composées automatiquement, avec deux sujets placés par règle.
- Des codes en chiffres (GS), ou un code « recette » (deux gouttes).
- Des variantes adaptatives, qui favoriseraient les recettes les moins réussies.
- Un album complet, ou l'impression et le partage des dessins.
- Des consignes vocales et un affichage paysage.

## 12. Points tranchés avec HUB.md et DICTEE.md
Tous sont arbitrés dans le cadre commun ([README.md](README.md) §5) :
- types dans `src/storage/colorings.ts`, sur `GameRecordBase` : `ColoringRecord` et non `ColoringRun` (A1) ;
- reprise par une nouvelle partie liée (`resumedFrom`), jamais par réouverture ; pas de `stops` ni d'`openedAt` (A2).
  L'intention de cette spec (« une partie = un dessin ») est gardée dans le bloc de statistiques, qui compte les
  dessins par chaîne (§5.4) ;
- clôture au lancement générique, avec `isColoringFinished` (A3) ;
- `useSoftEnd` pour la fin douce, avec une unité = une case (A4) ;
- palier dans `Profile.gameSettings.coloring.tier`, réglé dans la fiche enfant (A6) ;
- `ColoringStats` et `ColoringSettings` montés par l'espace parent, picto de tuile dans `GameIcon`, maison `to-hub`
  (A7) ; « Temps de jeu total » inclut Σ `activeMs` (A8) ;
- aides de validation partagées dans `src/storage/validate.ts` (HUB.md §5.2) ;
- retour de l'écran de fin vers le hub, puis reprise du dessin interrompu (§3.6), sans autre état à transmettre.
