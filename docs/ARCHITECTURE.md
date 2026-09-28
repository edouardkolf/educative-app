# Architecture — Petits Malins

PWA éducative pour la maternelle et le CE1, installée sur un téléphone Android partagé par deux enfants.
Ce document est la référence pour les humains et pour les agents : en cas de doute, il fait foi.

## 1. Stack et raisons

| Choix | Pourquoi | Ce que ça engage pour la suite |
|---|---|---|
| **Vite + TypeScript strict** | Build rapide, typage qui attrape les erreurs avant le téléphone. | `npm run build` produit un dossier `dist/` statique. |
| **Preact** (API React, 4 ko) | Composants lisibles, écosystème React, très léger. | Tout développeur ou agent qui connaît React s'y retrouve. |
| **vite-plugin-pwa** (Workbox) | Manifest + service worker générés : installable, plein écran, hors ligne. | Nouvelle version recherchée au lancement puis toutes les heures, installée au retour sur l'écran des profils, jamais pendant une partie. |
| **IndexedDB via `idb`** | Stockage local durable, requêtable ; `idb` = 1 ko autour de l'API native. | Données liées au navigateur du téléphone : **l'export JSON est la sauvegarde**. |
| **Navigation par hash** (`#/map`) | Marche sur GitHub Pages sans configuration serveur, gère le bouton retour Android. | Compatible Capacitor tel quel. |
| **Sons synthétisés (Web Audio)** | Aucun fichier audio, aucune licence, fonctionne hors ligne. | Les consignes vocales (V2) utiliseront de vrais fichiers via le champ `audio`. |
| **Emoji natifs** pour les objets illustrés | Zéro poids, rendu Android homogène. | Rendu différent sur iPhone ; remplaçables par des SVG via `src/ui/objects.ts`. |
| **Vitest + Playwright** | Tests unitaires de la logique ; tests de bout en bout sur un viewport Pixel 7. | La CI GitHub lance les tests unitaires et le build ; Playwright tourne en local. |

**Passage à Capacitor/APK plus tard :** `npm run build` avec `BASE_PATH=./`, puis `npx cap add android`.
Aucune réécriture. Seule attention : les données d'une PWA et d'un APK sont dans deux stockages différents,
donc il faut les migrer par export puis import.

## 2. Arborescence

```
content/                     ← contenu pédagogique : du JSON uniquement
  level.schema.json          ← schéma d'un niveau (autocomplétion dans VS Code)
  track.schema.json          ← schéma d'un parcours
  tracks/ms.json, ce1.json   ← un parcours par classe = ordre des niveaux sur la carte (choisi par enfant, espace parent)
  levels/<parcours>/*.json   ← un fichier par niveau
src/
  app/                       ← coquille : routes, état global (profil actif), App.tsx
  engine/                    ← logique pure : chargement du contenu, hasard, étoiles, progression, stats
  mechanics/<mécanique>/     ← générateur de manches + vue, une mécanique par dossier
  games/                     ← jeux libres hors parcours : registre (index.ts), fin douce partagée (useSoftEnd)
    dictation/               ← dictée quotidienne (CE1) : séries, tirage, machine d'état, clavier, écran, stats
    coloring/                ← coloriage magique (MS) : catalogue de dessins, récipient, paliers, écran, stats
  screens/                   ← écrans enfant : profils, hub, carte, partie, fin de niveau, écran de fin
  parent/                    ← espace parent : code, profils, stats, réglages, export/import
  storage/                   ← IndexedDB : profils, parties, parties de jeu, réglages ; export/import
  ui/                        ← composants partagés : formes SVG, sons, voix, main animée, étoiles
tests/e2e/                   ← parcours de bout en bout (Playwright) ; nav.ts = aides de navigation communes
docs/                        ← architecture, contenu, déploiement ; docs/specs/ = specs du hub et des jeux
```

## 3. Parcours de l'utilisateur

```
Premier lancement → Espace parent : création du code → ajout des enfants
Écran profils (avatars) ──tap──▶ Hub (sans texte) ──▶ Carte du parcours ──tap niveau──▶ Partie (N manches)
       ▲  appui long 2 s                  │   ▲                        │ bouton maison = abandon
       │  sur le cadenas                  │   └── maison ◀─────────────┘ (carte → hub)
       └── Espace parent (code) ◀         ├──▶ Dictée quotidienne (CE1) ─ maison → hub
                                          └──▶ Coloriage magique (MS) ─── maison → hub
Fin de niveau : étoiles une par une ▶ suivant / rejouer / carte
Plus de vies : visage triste ▶ rejouer / carte (jamais de relance automatique)
Minuteur ou quota atteint → Écran de fin (bloquant, même après rechargement) → code parent → +5/+15 min → hub
```

- Le **hub** montre l'avatar (retour aux profils), la tuile de la carte et une tuile par jeu libre visible pour
  l'enfant (défaut du parcours : `ms` → coloriage, `ce1` → dictée ; réglable dans la fiche enfant).
- **Maison = remonter l'historique** jusqu'au hub (`returnTo('hub')`, `src/app/routes.ts`) au lieu d'empiler une
  entrée : le bouton retour Android ne rouvre jamais une partie ou un jeu restés dessous.
- L'**espace parent** ne s'ouvre que depuis l'écran profils (appui long sur le cadenas) ou depuis l'écran de fin.
- Les **jeux libres** sont illimités : ni cadenas, ni vies, ni étoiles de carte. Seul le temps de la séance les borne.
  Spécifications : `docs/specs/` (README.md = cadre et arbitrages, HUB.md, DICTEE.md, COLORIAGE.md).

## 4. Contenu : niveaux et parcours

- Un niveau = un fichier JSON conforme à `content/level.schema.json`. Types TypeScript équivalents : `src/engine/types.ts`.
- Champs communs : `id` (= nom du fichier), `title` et `objective` (lus par le parent), `skill` (compétence visée),
  `mechanic`, `rounds`, `tutorial`, `stars`, `lives`, `audio` (vide en V1), `params` (paramètres de difficulté propres à la mécanique).
- Un parcours liste les niveaux dans l'ordre de la carte et fixe `minStarsToUnlockNext`.
- Le contenu est **intégré au build** (`import.meta.glob`), donc disponible hors ligne. `npm run validate:content` vérifie :
  le schéma, id = nom de fichier, chaque niveau référencé une seule fois, les références existantes, `min ≤ max`,
  les réservoirs de couleurs et de formes assez grands, et que chaque niveau génère bien ses manches avec 20 graines différentes.
  Le build échoue si le contenu est invalide : un niveau cassé n'arrive jamais sur le téléphone.

**Ajouter un niveau** : créer `content/levels/ms/ms-xxx-nn.json`, l'insérer dans `content/tracks/ms.json`, pousser. C'est tout.

## 5. Moteur ↔ mécaniques

Le **moteur** (écran Partie, `src/screens/LevelPlayer.tsx`) est générique :
1. il charge le niveau et appelle `mechanic.generateRounds(params, rounds, rng)` ;
2. il ouvre une partie (`startRun`, avec `replay = hasCompleted(...)`) ;
3. il affiche `mechanic.View` avec `{ round, wrongChoices, solved, onChoose }` ;
4. sur `onChoose` : si c'est juste, il joue le son de réussite, passe `solved` à vrai et enregistre la manche, puis passe à la suivante après environ 900 ms.
   Si c'est faux, il joue le son d'erreur douce et ajoute le choix à `wrongChoices` (grisé) ; l'enfant réessaie.
   La première erreur d'une manche coûte une vie (les suivantes, dans la même manche, sont gratuites). À 0 vie, la partie
   s'arrête (`out-of-lives`) et l'écran d'échec propose rejouer ou la carte ;
5. en fin de niveau, il calcule `computeStars`, appelle `completeRun` et affiche l'écran des étoiles.

Une **mécanique** (`src/mechanics/<id>/`) ne connaît ni le stockage ni les sons :
elle génère des manches (`Round = { data, answer }`) et les affiche. Chaque élément tapable porte `data-choice="<id>"`.
Le conteneur de manche porte `data-answer` (utile aux tests e2e, invisible pour l'enfant).

**Tutoriel** : si `level.tutorial` est vrai, pendant la première manche, une main (👆) glisse vers `[data-choice=<answer>]` et mime un tap, en boucle toutes les 3 s, jusqu'au premier tap de l'enfant.

## 6. Données locales (IndexedDB « petits-malins »)

| Store | Clé | Contenu |
|---|---|---|
| `profiles` | `id` | prénom, avatar, parcours, limites (session, jour) ; optionnels : jeux libres visibles (`games`), réglages de jeu (`gameSettings`) |
| `runs` | `id` (index `profileId`, `[profileId, levelId]`) | une partie : début, fin, statut, raison d'arrêt, rejeu, manches, étoiles |
| `overrides` | `[profileId, levelId]` | niveau forcé débloqué ou verrouillé par le parent |
| `usage` | `[profileId, day]` | secondes de jeu actives par jour, minutes bonus accordées ; secondes par activité (`activitySeconds` : hub, carte, dictée, coloriage) |
| `settings` | `"app"` | empreinte du code parent, son, session en cours de chaque enfant, écran de fin actif |
| `dictations` | `id` (index `profileId`) | une dictée : série, graine du tirage, mots prévus, un item par mot validé (saisie, juste du premier coup, réécoutes, durées) |
| `colorings` | `id` (index `profileId`) | une séance sur un dessin : dessin, palier, couleurs et légende figées, essais de peinture ; `resumedFrom` relie la reprise d'un dessin à la séance précédente |

- Base en **version 2** (`src/storage/db.ts`) : la montée v1 → v2 crée les deux stores de jeu, vides ; rien n'est migré.
- Les parties de jeu partagent un socle (`GameRecordBase`, `src/storage/game-records.ts`) : même statut et même raison
  d'arrêt que les parties de niveaux (sans `out-of-lives`), plus `activeMs`. **Une partie close ne se rouvre jamais** :
  reprendre un dessin crée une nouvelle partie liée. Au lancement, `closeStaleGameRecords` clôt les parties restées en
  cours (`completed` si tout était joué, sinon `time-up` ou `closed`), comme `closeStaleRuns`.
- **Export v2** : ajoute `dictations` et `colorings`. L'import accepte les sauvegardes v1 (sans parties de jeu) et v2.

La progression (étoiles, niveaux débloqués) est **recalculée à partir des parties** (`computeLevelStates`) : aucune donnée dupliquée qui pourrait diverger.
De même, la série proposée en dictée et le palier du coloriage se déduisent des parties de jeu.
Au démarrage, l'app appelle `navigator.storage.persist()`. Le résultat (persistant oui/non) s'affiche dans l'espace parent.

## 7. Statistiques : définitions

| Indicateur | Définition exacte |
|---|---|
| **Essais** | Nombre de parties lancées sur le niveau (tous statuts). |
| **Réussites** | Parties terminées (toutes les manches résolues). |
| **Taux de réussite** | Manches réussies **du premier coup** / manches jouées. Mesure la compétence, pas la persévérance : comme l'enfant réessaie jusqu'à trouver, « terminer » ne dit rien. |
| **Abandons** | Parties quittées avant la fin : bouton maison (`quit`) ou app fermée pendant la partie (`closed`, détecté au lancement suivant). |
| **Interruptions** | Parties coupées par le minuteur ou le quota (`time-up`). Ce ne sont **pas** des abandons. |
| **Vies perdues** | Parties arrêtées faute de vies (`out-of-lives`). Ce ne sont pas des abandons. |
| **Rejeux volontaires** | Parties lancées sur un niveau déjà réussi (≥ 1 étoile) avant le lancement. |
| **Meilleures étoiles** | Maximum d'étoiles sur les parties terminées. |
| **Temps de jeu** | Somme des durées de manches (hors écrans de transition). |

Étoiles d'une partie : `misses` = manches non réussies du premier coup. 3 étoiles si `misses ≤ maxMissesFor3` (défaut 0),
2 étoiles si `misses ≤ maxMissesFor2` (défaut 1), sinon 1. Terminer rapporte toujours au moins 1 étoile.

**Jeux libres et temps par activité** (page statistiques de l'enfant, `src/parent/stats.ts`) :

| Indicateur | Définition exacte |
|---|---|
| **Temps par activité** | Temps actif compté par l'horloge de session (celui des limites), par jour local et selon l'écran : Accueil (hub), Carte (carte et parties de niveaux), Dictée, Coloriage. Le temps non ventilé des jours d'avant la v2 va à la Carte. Aujourd'hui et 7 derniers jours. |
| **Parties** (par jeu) | Enregistrements du jeu, tous statuts. Une partie = une dictée, ou une séance sur un dessin. |
| **Terminées / Abandons / Interruptions** | `completed` / `quit` ou `closed` / `time-up`, comme pour les niveaux. |
| **Temps de jeu** (par jeu) | Somme des `activeMs` : écran de jeu visible, hors écrans de choix et de fin. |
| **Jours joués (7 j)** | Jours locaux distincts, sur les 7 derniers jours, où au moins une partie du jeu a commencé. |
| **Temps de jeu total** (en-tête) | Niveaux + parties de jeu. |

Chaque jeu ajoute ses propres indicateurs (mots fragiles et mots sus pour la dictée, réussite par recette et
palier pour le coloriage) : définitions dans `docs/specs/DICTEE.md` §5.3 et `docs/specs/COLORIAGE.md` §5.4.

## 8. Contrôle parental

- **Code parent** : 4 chiffres, stocké haché (SHA-256 avec sel). Si le code est oublié, une multiplication d'adulte (ex. 17 × 23) permet de le réinitialiser.
- **Accès** : appui long de 2 s sur le cadenas de l'écran profils, puis saisie du code. Un tap bref ne fait rien.
  Il n'y a pas de cadenas sur le hub ni sur la carte : l'espace parent ne s'ouvre que depuis l'écran profils (ou l'écran de fin).
- **Minuteur de session** (par enfant, en minutes) : compte le temps actif (app visible, profil sélectionné, hub, carte,
  partie ou jeu libre). Chaque enfant a sa propre session. Elle reprend s'il revient dans les 10 minutes, donc passer par
  le profil de sa sœur ne remet pas le compteur à zéro.
  Sur le hub et la carte, l'échéance affiche l'écran de fin tout de suite. En partie ou en jeu, c'est une **fin douce** :
  l'unité en cours se termine (une manche, un mot de dictée, une case de coloriage ; 60 s maximum), puis l'écran de fin
  s'affiche et la partie passe en `time-up`. Les jeux utilisent le hook partagé `useSoftEnd` (`src/games/useSoftEnd.ts`).
- **Quota quotidien** (par enfant) : même mécanisme, cumulé sur la journée locale.
- **Écran de fin** : visuel calme (lune, sans texte), persisté (`settings.lock`). Ni un rechargement, ni le bouton retour Android, ni la navigation directe ne le contournent.
  Après le code parent, le parent choisit : +5 min, +15 min (minutes bonus du jour), qui ramènent au hub, ou retour aux profils.
- **Jeux libres** : la fiche enfant choisit les jeux visibles sur le hub (par défaut selon le parcours) et le palier du
  coloriage. La dictée a besoin de la voix du téléphone : si elle manque, la fiche enfant le signale avec le remède.
- **Hors périmètre** : empêcher de quitter l'app. C'est l'épinglage d'écran Android qui s'en charge.

## 9. Règles UX pour l'enfant non lectrice

- Aucun texte nécessaire dans les écrans enfant : pictos, couleurs, animations. Les textes de l'espace parent sont en français.
  Exception CE1 : les mécaniques `compare`, `calc`, `spelling` et `read`, et la dictée quotidienne, affichent des nombres,
  des signes et des mots courts (l'enfant apprend à lire) ; les écrans communs (profils, hub, carte, fin de niveau) et le
  coloriage restent sans texte.
  `calc` (pavé numérique) et `spelling` (étiquettes) répondent en composant puis en validant ✓ : c'est la valeur
  composée qui est envoyée au moteur comme choix.
- **Dictée** : la phrase dictée n'est jamais affichée (elle contient le mot) ; seule la voix la dit.
- Cibles tactiles : ≥ 72 px pour les choix de jeu, ≥ 56 px pour la navigation. Tap uniquement, pas de glisser-déposer
  — exceptions : `sort` (le trieur magique) et `builder` (le constructeur) acceptent le glisser-déposer **et** le tap
  (sélectionner puis taper la cible équivaut à y déposer l'objet/la pièce), pour rester jouables même sans geste de
  glissé maîtrisé. Dans `builder`, un emplacement peut être visuellement plus petit que 72 px (la silhouette doit
  rester fidèle à la figure) : sa zone tapable est alors agrandie en creux, en restant centrée sur lui.
  Le coloriage suit la même règle : chaque case a un disque tapable de 72 px centré sur son code, et le glisser depuis
  le récipient n'est qu'une alternative au tap.
- **Exception de taille : le clavier de la dictée.** 37 touches ne tiennent pas en 72 px sur un téléphone : 7 colonnes de
  52 px à 412 px de large (44 px au moins dès 360 px). Garde-fous : ✓ garde 72 px, loin des lettres ; chaque lettre
  tapée s'affiche en grand ; aucun temps n'est limité.
- Erreur douce : son doux, léger tremblement, le choix se grise, on réessaie. Aucun compte à rebours visible, aucune récompense aléatoire.
- **Vies** (cœurs en haut à droite) : taper au hasard finit toujours par trouver, les vies y mettent une limite.
  Une vie en moins par manche ratée du premier coup (pas par tap : un enfant qui se trompe sur un jeu à 4 choix
  n'est pas pénalisé trois fois). À 0 vie : écran d'échec (😢), rejouer ou carte, jamais de relance automatique —
  un enfant fatigué qui tape au hasard est invité à s'arrêter plutôt qu'à avancer sur la carte sans le mériter.
  Nombre de vies (`livesFor`, `src/engine/lives.ts`) : le plus généreux entre 2 et 4 qui laisse terminer au plus
  1 partie sur 4 en tapant au hasard, d'après le nombre de choix et de manches. En pratique : 2 vies sur les jeux
  à 2 choix et les niveaux courts à 3 choix, 3 à 4 vies ailleurs. Un niveau peut forcer la valeur avec `lives`.
- Sons obligatoires : réussite, erreur douce, étoile gagnée.
- Éléments interactifs qui attirent l'œil : la case à compléter pulse, les choix sont grands et contrastés.
- Pas de zoom, pas de sélection de texte, pas de menu contextuel, pas de tirer-pour-rafraîchir.

## 10. Conventions

- Identifiants de code en anglais ; textes affichés au parent et documentation en français.
- Logique pure (engine, générateurs de mécaniques, logique des jeux libres) couverte par des tests Vitest (`*.test.ts` à côté du code).
- Les fichiers marqués `CONTRAT` sont la frontière entre modules. On les modifie volontairement, jamais en passant.
- Vérifications avant de livrer : `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`.
