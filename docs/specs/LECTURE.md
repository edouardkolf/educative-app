# Spec — « J'apprends à lire » : programme de lecture de zéro au CP

Cadre : [README.md](README.md) (jeux hors parcours, arbitrages A1–A12), [HUB.md](HUB.md), [MORPION-PENDU.md](MORPION-PENDU.md)
(modèle d'un jeu avec son propre store). Lot du 10/11/2026, pour la petite (moyenne section, 4 ans et demi, non lectrice).
Types : `src/games/reading/types.ts` (**CONTRAT**). Les souches posées par l'orchestrateur (L0) fixent toutes les signatures.

## 1. Résumé et décisions du PM

Un programme à part, « J'apprends la lecture », qui part de zéro et va jusqu'à l'entrée en CP : l'enfant voit
progressivement toutes les lettres, dans un ordre fondé sur les recommandations Éduscol (régularité, fréquence, sons
qu'on peut faire durer d'abord). Décisions du PM, à reprendre telles quelles :

- « Un sous-menu de la section maternelle, comme les mini-jeux » : une **tuile du hub** (défaut : parcours `ms`), qui
  ouvre un **écran d'accueil propre au programme** (le sous-menu : les cinq étapes), d'où partent les séances.
- « Pour le moment on va faire avec la voix synthétique, les P et M peuvent être prononcés Pe et Me. »
- L'enfant doit pouvoir jouer **seule** : tout passe par la voix et la démonstration (§9).
- Rythme visé : 3 séances de 5 minutes par semaine. **La maîtrise décide, pas le calendrier.**

Cinq règles pédagogiques : l'oreille avant l'œil ; le son avant le nom de la lettre ; du plus régulier au plus piégeux ;
fusionner tôt, toujours en reliant la syllabe à un vrai mot ; passage d'étape à la maîtrise.

## 2. Parcours de l'enfant

```
Hub ──tuile « reading »──▶ Accueil lecture (5 étapes) ──tap étape──▶ Séance (8 à 10 questions) ──▶ Fête ──▶ Accueil
        maison (to-hub) ◀──────────┘                         maison (to-hub) = abandon de la séance
```

- **Accueil** (`data-testid="reading-home"`) : un chemin de cinq médaillons, sans texte, un par étape
  (`data-testid="reading-stage-<n>"`, `data-state="done|current|locked"`). Pictos : oreille (1), bouche qui chante /
  voyelles (2), lettre et serpentin de son (3), lettre et éclair (4), livre ouvert (5) — dessinés en SVG, pas d'émoji
  d'interface. L'étape en cours pulse et porte un gros bouton lecture ; taper dessus lance la séance choisie par l'app.
  Une étape validée (`done`, avec une coche) se retape : séance de **révision** de cette étape (`review: true`).
  Une étape verrouillée ne réagit pas (léger tremblement, son d'erreur douce). Sous chaque médaillon de l'étape en
  cours : une jauge discrète = items acquis / items à acquérir. Programme fini : les cinq sont `done`, tout se révise.
- **Voix indisponible ou son coupé** (`checkVoice()` ≠ `ready`) : l'accueil affiche un grand picto `speaker-off` et
  aucune étape n'est tapable (`data-testid="reading-unavailable"`). La tuile du hub porte déjà le badge.
- **Séance** (`data-testid="reading-session"`) : en haut la maison (`to-hub`), une rangée de points d'avancement (un
  par question prévue), le bouton haut-parleur (`data-testid="reading-replay"`, ≥ 72 px, toujours visible). Au centre
  la vue du jeu en cours (§4). Le conteneur de question porte `data-game`, `data-answer` et `data-item` (tests e2e).
- **Déroulé d'une question** : (1) si le jeu n'a jamais été montré : démonstration (§9.3) ; (2) la voix dit la consigne
  (`question.prompt`), les choix sont visibles mais inactifs (`disabled`) ; si `speakChoices`, la voix énumère les
  choix en les mettant en avant (`spokenChoice`) ; (3) l'enfant répond. Juste : `playSuccess`, `solved`, la voix dit
  `question.praise`, question suivante après ~900 ms (ou la fin de `praise`). Faux : `playError`, le choix se grise
  (`wrongChoices`), elle réessaie ; si le choix faux est une lettre ou une syllabe, la voix dit le son de ce choix
  (« la lettre touchée chante son propre son ») ; la question est reposée plus tard (`requeueAfterMiss`).
  Seule la **première tentative** est enregistrée (`ReadingAnswer`).
- **Relance** : 9 s après la fin de la consigne sans tentative → la consigne est redite et `hintChoice = answer`
  (clignotement doux) ; `hinted: true`. Une seule relance par question.
- **Fin de séance** (`data-testid="reading-end"`) : `playFanfare`, une animation de récompense (l'étoile de l'étape
  grandit, confettis ; si une étape vient d'être validée : le médaillon suivant s'ouvre, fête plus longue), puis un
  seul bouton (coche, `data-testid="reading-end-continue"`) qui ramène à l'accueil. **Jamais d'enchaînement automatique.**

## 3. Le programme

### 3.1 Étapes et items

Un **item** est une unité de maîtrise : `g:<graphème>` ou `k:<compétence>`.

| Étape | Titre parent | Items (ordre d'introduction) | Items qui bloquent le passage |
|---|---|---|---|
| 1 | J'écoute | `k:count`, `k:onset`, `k:rhyme` | tous |
| 2 | Les voyelles | `g:a`, `g:i`, `g:o`, `g:u`, `g:é` | tous |
| 3 | Les consonnes qui durent | `g:l`, `g:r`, `k:blend`, `g:f`, `g:m`, `g:s`, `g:e`, `g:j`, `g:v`, `g:n`, `g:z`, `g:ou`, `g:ch` | tous |
| 4 | Les consonnes brèves | `g:p`, `g:t`, `k:blend-stop`, `g:b`, `g:d`, `g:c`, `g:g` | tous |
| 5 | Je lis | `k:read`, `k:case`, `g:k`, `g:q`, `g:h`, `g:x`, `g:y`, `g:w`, `g:on`, `g:oi` | `k:read`, `k:case` seulement |

### 3.2 Graphèmes (`GRAPHEMES`, `order` = n°)

| N° | Graphème | Étape | `kind` | Texte du son (§6) | Mot repère (image) |
|---|---|---|---|---|---|
| 1 | a | 2 | vowel | a | avion ✈️ |
| 2 | i | 2 | vowel | i | île 🏝️ |
| 3 | o | 2 | vowel | o | orange 🍊 |
| 4 | u | 2 | vowel | u | usine 🏭 |
| 5 | é | 2 | vowel | é | étoile ⭐ |
| 6 | l | 3 | long | leu | lune 🌙 |
| 7 | r | 3 | long | reu | robot 🤖 |
| 8 | f | 3 | long | feu | fusée 🚀 |
| 9 | m | 3 | long | meu | moto 🏍️ |
| 10 | s | 3 | long | seu | soleil ☀️ |
| 11 | e | 3 | vowel | eu | — |
| 12 | j | 3 | long | jeu | jus 🧃 |
| 13 | v | 3 | long | veu | vélo 🚲 |
| 14 | n | 3 | long | neu | nuage ☁️ |
| 15 | z | 3 | long | zeu | zèbre 🦓 |
| 16 | ou | 3 | digraph | ou | ours 🐻 |
| 17 | ch | 3 | digraph | cheu | chat 🐱 |
| 18 | p | 4 | short | peu | poule 🐔 |
| 19 | t | 4 | short | teu | tortue 🐢 |
| 20 | b | 4 | short | beu | ballon 🎈 |
| 21 | d | 4 | short | deu | dé 🎲 |
| 22 | c | 4 | short | queu | canard 🦆 |
| 23 | g | 4 | short | gueu | gâteau 🎂 |
| 24–29 | k, q, h, x, y, w | 5 | rare | queu, queu, (muette : « rien »), xeu → « kss », i, veu | kiwi 🥝, —, hibou 🦉, —, yoyo 🪀, — |
| 30–31 | on, oi | 5 | bonus | on, oi | — |

`gated` = vrai pour les n° 1 à 23, faux ensuite. Affichage enfant : **capitales** (`upper`), sauf le jeu des jumelles.
Un digraphe (OU, CH, ON, OI) s'affiche comme **un seul bloc collé**, jamais deux tuiles.
Pourquoi cet ordre : voyelles d'abord (une lettre = un son stable) ; consonnes qu'on peut prolonger avant les
occlusives ; les sons proches sont éloignés (F/V, M/N, S/Z, P/B, T/D) ; E après les premières consonnes (la plus
ambiguë) ; OU et CH tôt pour casser « un son = une lettre » ; C et G seulement durs (devant A, O, U).

### 3.3 Syllabes (`SYLLABLES`)

Toutes les combinaisons consonne (ou CH) + voyelle parmi `a, i, o, u, é, ou` qui se lisent sans piège. Exclure : toute
syllabe avec `c` ou `g` devant `i`, `é`, `e` ; les syllabes en `e` ; `q`, `h`, `x`, `y`, `w`, `k`. `picture` : un mot
du catalogue qui commence par la syllabe, quand il existe (LA → lama, MO → moto, VÉ → vélo). `k:blend` n'utilise que
des consonnes longues (étape 3) ; `k:blend-stop` exige au moins une question sur deux avec une consonne brève.

### 3.4 Mots à lire (`READ_WORDS`)

Entièrement déchiffrables avec les graphèmes n° 1 à 23, sans lettre muette ni double consonne, 2 ou 3 syllabes CV (une
voyelle seule en tête acceptée), chacun avec une image sans ambiguïté. Base : AMI, MOTO, LAMA, VÉLO, SOFA, PUMA, PAPA,
PAPI, BÉBÉ, DODO, JUDO, ZÉRO, TUBA, DOMINO, LAVABO, NUMÉRO, ROBO… — ne garder que ceux qui ont une image Noto claire,
et compléter (KOALA exclu : K ; viser au moins 14 mots).

### 3.5 Images (`PICTURES`)

Catalogue propre à la lecture (`src/games/reading/pictures.ts`), rendu avec `<Emoji>` (SVG Noto embarqués). Tout nouvel
émoji est ajouté à `scripts/fetch-emoji.mjs` (bloc commenté « src/games/reading/pictures.ts ») puis téléchargé par ce
script ; `src/ui/emoji-files.test.ts` doit passer. Besoins : au moins 12 mots par nombre de syllabes (1, 2, 3) pour le
tambour ; pour « commence pareil », au moins 6 familles de 2 mots partageant la **même première syllabe orale**
(MAman / MAnège…) ; pour la rime, au moins 6 familles de 2 mots (`rhyme` identique : chapeau / bateau / gâteau…) ;
pour « par quoi ça commence », au moins 3 images par graphème des étapes 2 à 4 quand la langue le permet (aucune pour
`e` ; `c` = mots en ca/co/cu ; `g` = ga/go/gu ; ne jamais classer sous `s` un mot en « ch », ni sous `o` un mot en
« ou/on/oi », ni sous `a` un mot en « an/ai/au »). Mots connus d'une enfant de 4 ans, images non ambiguës.

## 4. Les huit jeux

Chaque vue reçoit `ReadingViewProps` et ne fait qu'afficher : pas de voix, pas de son, pas de stockage. Tout élément
tapable porte `data-choice="<id>"`. Cibles ≥ 72 px, bien espacées (≥ 12 px). Une seule action : **toucher**. Pas de
glisser-déposer, pas de bouton de validation. Rien ne défile en 360 × 640. `prefers-reduced-motion` respecté.

| Jeu | Item | Stimulus | Choix | Consigne parlée (`prompt`) |
|---|---|---|---|---|
| `syllable-drum` | `k:count` | image | aucun : un tambour (`data-choice="drum"`) | « {mot} » (dit lentement) |
| `same-start` | `k:onset` | image modèle | 3 images (1 même première syllabe) | « {mot}. Qui commence comme {mot} ? » + choix énumérés |
| `same-end` | `k:rhyme` | image modèle | 3 images (1 même rime) | « {mot}. Qui finit comme {mot} ? » + choix énumérés |
| `letter-sound` | `g:*` | haut-parleur | 2 ou 3 lettres capitales | « Touche la lettre qui chante », pause, son |
| `first-sound` | `g:*` | image | 2 ou 3 lettres capitales | « {mot}. Par quoi ça commence ? » |
| `syllable-machine` | `k:blend`, `k:blend-stop` | 2 blocs qui glissent l'un vers l'autre | 3 syllabes écrites | son 1, pause, son 2, pause, syllabe ; « Touche », syllabe |
| `mystery-word` | `k:read` | mot écrit | 3 images | aucune (la voix ne lit pas le mot) |
| `letter-twins` | `k:case` | capitale | 3 minuscules | « Touche la même lettre, en petit. » |

Précisions :

- **Tambour** : la vue compte elle-même les frappes (rebond du tambour, un point affiché par frappe, 4 au plus).
  Après la première frappe, une **coche verte** apparaît à côté des points (`data-choice="drum-ok"`) : la toucher
  valide (`onChoose(String(n))`). Pas de validation automatique (décision du PM, 11/11/2026). C'est la seule vue
  autorisée à jouer un son (`playTap` à chaque frappe).
  Faux : les points s'effacent et elle recommence. Relance (`hintChoice`) : le tambour pulse `answer` fois en rythme.
  `answer` ∈ '1'..'3'. `choiceCount` enregistré = 3.
- **Machine à syllabes** : à l'arrivée de la question, les deux blocs (`stimulus.parts`) sont écartés puis glissent et
  se collent (~1,2 s, synchronisé au mieux avec la voix ; durée fixe acceptable). Résolue : l'image `picture` de la
  syllabe apparaît (LA comme LAMA) et `praise` = « la, comme lama ».
- **Mot mystère** : le mot en très grand. Relance : les syllabes s'allument une à une (pas de clignotement de la réponse
  avant 2 passages). Résolue : `praise` = le mot lu par la voix.
- **Jumelles** : choix en minuscules scriptes (police Andika, déjà embarquée). Les paires b/d et p/q n'apparaissent
  comme leurres l'une de l'autre que si l'item `k:case` a déjà au moins 20 réponses.
- **Lettre nouvelle** (`isNew` sur la première question d'un item `g:*`) : avant la consigne, `prompt` commence par la
  présentation : son, pause, « comme », mot repère (ex. « meu… comme moto »), et la vue `letter-sound` montre la lettre
  seule en grand avec l'image du mot repère pendant cette présentation (`question.isNew` ; 2 choix seulement).
- **Leurres** : d'abord éloignés, puis proches. Paires proches : m/n, f/v, s/z, p/b, t/d, j/ch, o/ou, b/d, c/g, a/é,
  i/u. Un item avec moins de 4 réponses n'a pas de leurre proche ; au-delà, un leurre proche au moins s'il est déjà
  introduit. Les leurres sont pris parmi les graphèmes déjà introduits (état ≠ `new`) ; à défaut, parmi ceux qui
  précèdent dans l'ordre. 2 choix pour les 2 premières expositions d'un graphème, 3 ensuite.

## 5. Maîtrise et séances (logique pure, `progress.ts`, `session.ts`)

### 5.1 Graphème (`g:*`)
`new` → `learning` à la première réponse. `acquired` : **3 bonnes réponses d'affilée du premier coup, sur au moins
2 jours locaux différents**. `acquired` → `learning` après **2 erreurs d'affilée** (série remise à zéro).

### 5.2 Compétence (`k:*`)
`acquired` : au moins 10 réponses, **8 justes sur les 10 dernières**, réparties sur au moins 2 jours. Retour à
`learning` si les 10 dernières tombent à 5 justes ou moins.

### 5.3 Étapes
Une étape est **validée** quand tous ses items bloquants sont `acquired` **et** que le taux de premier coup des
2 dernières séances terminées (hors révision) de cette étape est ≥ 80 %. Les séances sont rejouées dans l'ordre
chronologique : **une étape validée le reste** (un item perdu revient simplement en révision). `stage` = première étape
non validée (5 si tout est validé, avec `finished: true`). `startStage` (réglage parent) : les étapes d'avant sont
validées d'office et leurs items partent `acquired` (ils peuvent ensuite être perdus par 2 erreurs).
Les réponses `retry: true` et les exemples guidés ne comptent jamais.

### 5.4 Composition d'une séance (`planSession`)
- 9 questions (8 à 10 acceptées), déterministe pour une graine.
- **Un seul item nouveau par séance**, introduit seulement si au plus 1 item de l'étape est `learning` ; il reçoit
  3 questions (la première `isNew`), jamais deux de suite sauf la présentation.
  Exception : la toute première séance (rien en cours, rien à réviser) mêle deux items nouveaux de l'étape
  (5 + 4 questions), pour ne pas enchaîner 9 fois le même jeu.
- Le reste : ~60 % sur les items `learning` de l'étape en cours (les moins réussis d'abord), ~40 % de révision d'items
  `acquired` de toutes les étapes (les plus anciens d'abord — les jeux d'écoute de l'étape 1 reviennent jusqu'au bout).
  S'il n'y a rien à réviser, tout va à l'étape en cours ; s'il n'y a rien en cours, tout va à la révision.
- Jamais deux fois la même cible (`target`) dans une séance hors item nouveau ; au plus 3 questions de suite du même jeu.
- `demos` : jeux de la séance absents de `progress.demosDone`.
- Séance de révision (`opts.stage`) : seulement les items de cette étape, aucun item nouveau.
- `requeueAfterMiss` : la question ratée est reposée 2 à 4 places plus loin (ou en dernier), une fois au plus.

## 6. Voix (`speech.ts`, `src/ui/voice.ts` inchangé)

- Sons : voyelles telles quelles (`a`, `i`, `o`, `u`, `é`, `ou`, `on`, `oi`), `e` → « eu » ; consonnes = consonne +
  « eu » (« leu », « meu », « peu »…), `c`/`k`/`q` → « queu », `g` → « gueu », `ch` → « cheu ». La synthèse lit « eu »
  de façon stable ; « re » ou « fe » seuls risqueraient d'être épelés.
- Syllabes : toujours la syllabe entière (« la », « mi »), **jamais** deux sons enchaînés pour en fabriquer une.
  Prévoir une table d'exceptions `SYLLABLE_SPEECH` pour celles que la synthèse lit mal (sigles, mots outils).
- **Pas de « et »** entre deux sons : son, `pauseMs` 450, son, `pauseMs` 450, syllabe.
- Débit `SOUND_RATE` 0,8 pour les sons, syllabes et mots ; consignes au débit par défaut du module voix.
- Consignes : une phrase courte, tutoiement, vocabulaire d'une enfant de 4 ans.
- `benchEntries()` : tout ce que la voix peut dire d'isolé (sons, noms, syllabes, consignes, mots des images), pour le
  banc d'écoute de l'espace parent (§8.5). Ces textes ne sont pas testés sur un vrai téléphone : le banc sert à ça.

## 7. Stockage (IndexedDB v5, export v5)

- Store `readings` (clé `id`, index `profileId`), créé par un bloc `if (oldVersion < 5)`. `DB_VERSION = 5`.
- `ReadingRecord` (`src/storage/readings.ts`, CONTRAT) étend `GameRecordBase`. Une partie = une séance, **créée à la
  première réponse** (A9), sauvegardée après chaque réponse, `completed` quand toutes les questions prévues ont une
  première réponse (`answers.filter(a => !a.retry).length >= planned`), sinon `abandoned` (`quit`, `closed`, `time-up`).
- `isReadingRecord` (import) : champs typés, `stage` 1 à 5, `answers.length ≤ 60`, `game` connu, `itemId` au bon format.
- `GameStoreName`, `GAME_STORES`, `GameRecordByStore`, clôture au lancement (`isReadingFinished`), `StorageSchema`.
- `EXPORT_VERSION = 5`, `SUPPORTED_IMPORT_VERSIONS` 1 à 5, `ExportBundle.readings`, import : absent avant v5 → vide ;
  lignes orphelines ignorées ; transaction d'import étendue. `src/parent/import.ts` compte aussi `readings`.
- `GameSettingsMap.reading?: ReadingSettingsValue` (`{ startStage?: 1..5 }`), validé à l'import comme `coloring`.
- La progression n'est **jamais stockée** : `computeProgress(listReadings(profileId), settings)`.

## 8. Espace parent

1. Registre : `parentLabel: 'J\'apprends à lire'`, `tileLabel: 'Lecture'`, `defaultTracks: ['ms']`, `store: 'readings'`,
   `checkAvailability` = la même vérification de voix que la dictée (message adapté : la lecture a besoin de la voix).
2. `ChildStats` : indicateurs communs du jeu (comme les autres) + `<ReadingStats profile records />`
   (`data-testid="game-stats-reading"`), libellé d'activité « Lecture ».
3. `ReadingStats` (`summarizeReading`) : étape en cours et titre ; items acquis / à acquérir ; séances terminées ;
   grille des items par étape (pastille `new` grise, `learning` orange, `acquired` verte, avec le taux de premier
   coup) ; **table des confusions** (demandé → choisi, les 8 plus fréquentes, sur les lettres et syllabes) ; alertes
   **« à accompagner »** : pour un jeu, au moins 12 réponses (hors `retry`) sur les 14 derniers jours et un taux de
   premier coup ≤ taux du hasard + 15 points (hasard = moyenne de `1 / choiceCount`) — texte : « Elle semble répondre
   au hasard à ce jeu : restez à côté d'elle pour une séance. » `data-testid` : `reading-stats-stage`,
   `reading-stats-acquired`, `reading-stats-sessions`, `reading-stats-alert-<game>`.
4. `ReadingSettings` (fiche enfant, sous la bascule du jeu) : « Étape de départ » (1 à 5, avec les titres du §3.1),
   défaut 1, avec une ligne d'aide (« Si elle connaît déjà ses lettres, commencez plus loin. »).
5. **Banc d'écoute** (`VoiceBench.tsx`, monté dans `ReadingStats`, replié par défaut,
   `data-testid="reading-bench"`) : nom de la voix du téléphone, puis `benchEntries()` par groupe, un bouton par
   entrée, et « Tout écouter » par groupe. Sert à repérer en deux minutes les sons qui sonnent faux.

## 9. Autonomie (règles communes aux huit jeux)

1. **Consigne parlée** au début de chaque question ; une seule phrase courte.
2. **Bouton haut-parleur** toujours visible : rejoue consigne et stimulus (`replays` + 1 avant la première tentative).
3. **Démonstration** à la première rencontre d'un jeu : la voix dit `gameInstruction(game)`, puis la première question
   de ce jeu est jouée en **exemple guidé** : `guided: true`, la main animée (`TutorialHand`) montre le bon choix, seul
   le bon choix réagit. Cet exemple n'est **pas enregistré** comme réponse ; le jeu est ajouté à `demos`. La même
   question est ensuite jouée normalement plus tard dans la séance (remise en fin de file).
   Tambour : la main tape le tambour `answer` fois, puis touche la coche.
9. **Réécouter le modèle** (décision du PM, 11/11/2026) : toucher l'image modèle (tambour, commence pareil, finit
   pareil, par quoi ça commence) ou le grand haut-parleur (la lettre qui chante) fait répéter le mot ou le son, sans
   rien valider (`onReplayModel`, `data-testid="reading-model"`, compté dans `replays`). Les choix de réponse ne
   font jamais répéter : toucher un choix = répondre.
4. **Une seule action : toucher.** 5. **Relance** après 9 s (§2). 6. **Aucun texte à lire** hors lettres, syllabes et
   mots du programme. 7. **Grandes zones tactiles** espacées. 8. **Fin de séance claire**, sans enchaînement automatique.


## 10. Intégration

- Route `{ name: 'reading' }`, hash `#/reading`, ajoutée à `GAME_ROUTES` (temps de jeu, garde de route, fin douce).
- `AppShell` monte `ReadingScreen`. `GameIcon` : tuile « reading » (un livre ouvert d'où sortent A et un son).
- Fin douce (`useSoftEnd`) : l'unité en cours est **une question** ; `checkpoint()` au début de chaque question et au
  lancement d'une séance. `time-up` → la séance passe `abandoned` / `time-up`.
- Temps actif : `useActiveClock`, compté pendant la séance (pas sur l'accueil ni la fête).
- Hub MS : 7 tuiles (carte + 6 jeux). Vérifier que la grille tient en 360 × 640 sans défilement gênant ; la tuile
  lecture vient **en premier** des jeux (ordre du registre : la placer juste après `coloring`).

## 11. Cas limites

- Aucune image pour un graphème dans `first-sound` → cet item n'est interrogé que par `letter-sound`.
- Trop peu de graphèmes introduits pour 3 choix → compléter par les suivants dans l'ordre (jamais moins de 2 choix).
- Séance quittée avant la première réponse → aucun enregistrement. Démonstration vue puis séance quittée sans réponse :
  la démo sera refaite (acceptable).
- Voix coupée en cours de séance (`speak` → `blocked`/`failed`) : la séance continue, l'écran n'attend jamais la voix
  plus de 6 s pour activer les choix.
- Changement de jour pendant une séance : `at` de chaque réponse fait foi.
- Programme fini : l'accueil reste jouable en révision, `planSession` ne lève jamais.

## 12. Tests

- Unitaires (Vitest, à côté du code) : `content.test.ts` (intégrité : 26 lettres présentes, `order` uniques, images et
  fichiers d'émoji, familles d'attaque et de rime en nombre, mots déchiffrables sans graphème hors programme, syllabes
  conformes au §3.3, `stageItems`/`gatedItems` conformes au §3.1 — ce fichier est pris par `npm run validate:content`),
  `speech.test.ts`, `progress.test.ts` (chaque règle du §5.1 à 5.3, dont les 2 jours et la monotonie des étapes),
  `session.test.ts` (200 graines × états variés : jamais d'exception, 8 à 10 questions, un item nouveau au plus,
  réponse parmi les choix, ids de choix uniques, leurres introduits, règles du §5.4), `stats.test.ts`,
  `src/storage/readings.test.ts`, mises à jour de `db.test.ts`, `export-import.test.ts`, `game-records.test.ts`,
  `games/index.test.ts`, `routes.test.ts`, `parent/import.test.ts`.
- E2E (`tests/e2e/reading.spec.ts`, fausse voix comme `dictation.spec.ts`, navigation par `nav.ts`) : tuile → accueil
  → séance complète en répondant juste via `data-answer` (démo comprise) → fête → accueil ; une erreur grise le choix
  et repose la question ; statistiques parent visibles ; réglage « étape de départ » à 2 → la séance propose des
  lettres ; voix absente → `reading-unavailable`. Mise à jour de `hub.spec.ts` (tuiles MS).

## 13. Découpage en tâches

| Tâche | Fichiers (propriété exclusive) | Dépend de |
|---|---|---|
| L0 contrats (orchestrateur) | `src/games/reading/types.ts`, toutes les souches, cette spec | — |
| L1 socle | `src/storage/**` (dont `readings.ts`), `src/app/routes.ts` (+ test), `src/app/AppShell.tsx`, `src/app/session.ts` si besoin, `src/games/index.ts` (+ test), `src/ui/icons/GameIcon.tsx`, `src/screens/hub/**`, `src/screens/Hub.tsx` si besoin, `src/parent/ChildStats.tsx`, `src/parent/ChildForm.tsx`, `src/parent/import.ts` (+ test), `src/parent/stats.ts` si besoin | L0 |
| L2 contenu et logique | `src/games/reading/{curriculum,pictures,speech,progress,session}.ts` et leurs tests, `scripts/fetch-emoji.mjs`, `public/emoji/**` | L0 |
| L3 écran | `src/games/reading/ReadingScreen.tsx`, `ReadingHome.tsx`, `ReadingSession.tsx`, `ReadingEnd.tsx`, `StageIcon.tsx`, `reading.css`, hooks locaux (`useQuestionFlow.ts`…) | L0 |
| L4 vues de jeu | `src/games/reading/views/**` (huit vues, `views.css`, petits composants partagés des vues) | L0 |
| L5 parent | `src/games/reading/{stats.ts,stats.test.ts,ReadingStats.tsx,ReadingSettings.tsx,VoiceBench.tsx,reading-parent.css}` | L0 |
| L6 e2e, docs, revue | `tests/e2e/**`, `docs/ARCHITECTURE.md`, `docs/CONTENU.md`, `docs/PROGRESSION-MS.md`, `docs/specs/README.md` | L1–L5 |

Règle commune : chacun ne touche que ses fichiers ; un besoin hors périmètre est signalé dans le rapport final, pas
corrigé en passant. Aucune nouvelle dépendance npm. Identifiants en anglais, textes parent et commentaires en français.

## 14. Questions ouvertes pour le PM

1. **Lettres du prénom** : les présenter hors ordre pour l'accrocher ? Recommandation : plus tard, en bonus.
2. **Voix enregistrée** : si la fusion (« meu » + « a » → « ma ») bloque à l'étape 3, passer à des fichiers audio.
3. **Nom des lettres** : dit seulement dans le jeu des jumelles (« elle s'appelle ème »). Une comptine de l'alphabet ?
4. **Lien avec la carte** : des niveaux de lecture sur la carte MS (alternance) ? Hors de ce lot.

## 15. Hors périmètre

Écriture cursive, C et G doux, S entre deux voyelles, lettres muettes, autres graphèmes complexes, correction des textes
de voix depuis l'espace parent (le banc d'écoute ne fait qu'écouter), synchronisation entre téléphones.

## 16. Parcours de niveaux (décision du PM, 12/11/2026)

Premier retour d'usage : passer d'un jeu à l'autre dans la même séance empêchait de comprendre la consigne, et
9 questions étaient trop longues. L'enfant veut aussi voir des lettres tôt. Cette section **remplace** l'accueil en
cinq étapes (§2), la composition des séances (§5.4) et le passage d'étape (§5.3) ; la maîtrise des items (§5.1, §5.2)
reste calculée pour les statistiques parent et le choix des leurres.

- **Un niveau = un seul jeu = une séance.** La démonstration d'un jeu a lieu au premier niveau de ce jeu.
- **Séances courtes** : 5 questions aux étapes 1 et 2, 8 ensuite.
- **Deux pistes qui alternent** (`src/games/reading/levels.ts`, `LEVELS`) : un niveau « oreille », un niveau
  « lettres », et ainsi de suite. Oreille : tambour ×2, commence pareil ×2, finit pareil ×2, puis les trois en
  boucle ; dès que L et R sont connues, un niveau d'oreille sur deux est une machine à syllabes. Lettres, dans
  l'ordre du §3.2 : pour chaque lettre un niveau « la lettre qui chante », puis un niveau « par quoi ça commence »
  si elle a au moins 2 images. La première lettre (A) est le **niveau 2**. Fin du parcours : mot mystère et
  jumelles en alternance avec les lettres rares. 104 niveaux.
- **Contenu d'un niveau « lettre »** : la lettre du niveau est présentée d'abord, puis ~60 % des questions portent
  sur elle et le reste révise les lettres déjà vues (jamais une lettre à venir comme cible). Pour A, tout porte sur A.
- **Déblocage** : un niveau est gagné quand une séance terminée a **4 bonnes réponses du premier coup sur 5**
  (6 sur 8). Sinon on le rejoue : pas de fête, la voix dit « On réessaie ! ». Un niveau gagné le reste et se rejoue
  librement (`review: true`).
- **Enregistrement** : `ReadingRecord.levelId` (facultatif). Les séances sans niveau (avant le 12/11/2026) ne
  comptent pas pour le parcours. Le parcours n'est jamais stocké : `levelProgress(records, settings)`.
- **Étape de départ** (réglage parent) : les niveaux des étapes d'avant sont tenus pour gagnés. Les niveaux
  d'oreille mêlés aux voyelles sont d'étape 1 : « départ 2 » saute donc l'écoute et commence à la lettre A.
- **Accueil** : le chemin des niveaux, qui défile verticalement (niveau 1 en bas), centré sur le niveau en cours.
  `data-testid="reading-level-<rang>"`, `data-state` done|current|locked, `data-level`, `data-game`. Couleur par
  piste : bleu = écoute, rose = lettres, vert = assembler, orange = lire. Un médaillon « lettre » montre la lettre.
- **Parent** : « Niveau en cours : n sur 104 » (`reading-stats-level`).
