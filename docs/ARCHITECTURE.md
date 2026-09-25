# Architecture — Petits Malins

PWA éducative pour la maternelle, installée sur un téléphone Android partagé par deux enfants.
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
  tracks/ms.json             ← parcours Moyenne section = ordre des niveaux sur la carte
  levels/ms/*.json           ← un fichier par niveau
src/
  app/                       ← coquille : routes, état global (profil actif), App.tsx
  engine/                    ← logique pure : chargement du contenu, hasard, étoiles, progression, stats
  mechanics/<mécanique>/     ← générateur de manches + vue, une mécanique par dossier
  screens/                   ← écrans enfant : profils, carte, partie, fin de niveau, écran de fin
  parent/                    ← espace parent : code, profils, stats, réglages, export/import
  storage/                   ← IndexedDB : profils, parties, réglages ; export/import
  ui/                        ← composants partagés : formes SVG, sons, main animée, étoiles
tests/e2e/                   ← parcours de bout en bout (Playwright)
docs/                        ← architecture, contenu, déploiement
```

## 3. Parcours de l'utilisateur

```
Premier lancement → Espace parent : création du code → ajout des enfants
Écran profils (avatars) ──tap──▶ Carte du parcours ──tap niveau──▶ Partie (N manches)
       ▲  appui long 2 s sur le cadenas                 │ bouton maison = abandon
       └── Espace parent (code) ◀                       ▼
                                        Fin de niveau : étoiles une par une ▶ suivant / rejouer / carte
Minuteur ou quota atteint → Écran de fin (bloquant, même après rechargement) → code parent
```

## 4. Contenu : niveaux et parcours

- Un niveau = un fichier JSON conforme à `content/level.schema.json`. Types TypeScript équivalents : `src/engine/types.ts`.
- Champs communs : `id` (= nom du fichier), `title` et `objective` (lus par le parent), `skill` (compétence visée),
  `mechanic`, `rounds`, `tutorial`, `stars`, `audio` (vide en V1), `params` (paramètres de difficulté propres à la mécanique).
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
   Si c'est faux, il joue le son d'erreur douce et ajoute le choix à `wrongChoices` (grisé) ; l'enfant réessaie, sans limite ;
5. en fin de niveau, il calcule `computeStars`, appelle `completeRun` et affiche l'écran des étoiles.

Une **mécanique** (`src/mechanics/<id>/`) ne connaît ni le stockage ni les sons :
elle génère des manches (`Round = { data, answer }`) et les affiche. Chaque élément tapable porte `data-choice="<id>"`.
Le conteneur de manche porte `data-answer` (utile aux tests e2e, invisible pour l'enfant).

**Tutoriel** : si `level.tutorial` est vrai, pendant la première manche, une main (👆) glisse vers `[data-choice=<answer>]` et mime un tap, en boucle toutes les 3 s, jusqu'au premier tap de l'enfant.

## 6. Données locales (IndexedDB « petits-malins »)

| Store | Clé | Contenu |
|---|---|---|
| `profiles` | `id` | prénom, avatar, parcours, limites (session, jour) |
| `runs` | `id` (index `profileId`, `[profileId, levelId]`) | une partie : début, fin, statut, raison d'arrêt, rejeu, manches, étoiles |
| `overrides` | `[profileId, levelId]` | niveau forcé débloqué ou verrouillé par le parent |
| `usage` | `[profileId, day]` | secondes de jeu actives par jour, minutes bonus accordées |
| `settings` | `"app"` | empreinte du code parent, son, session en cours de chaque enfant, écran de fin actif |

La progression (étoiles, niveaux débloqués) est **recalculée à partir des parties** (`computeLevelStates`) : aucune donnée dupliquée qui pourrait diverger.
Au démarrage, l'app appelle `navigator.storage.persist()`. Le résultat (persistant oui/non) s'affiche dans l'espace parent.

## 7. Statistiques : définitions

| Indicateur | Définition exacte |
|---|---|
| **Essais** | Nombre de parties lancées sur le niveau (tous statuts). |
| **Réussites** | Parties terminées (toutes les manches résolues). |
| **Taux de réussite** | Manches réussies **du premier coup** / manches jouées. Mesure la compétence, pas la persévérance : comme l'enfant réessaie jusqu'à trouver, « terminer » ne dit rien. |
| **Abandons** | Parties quittées avant la fin : bouton maison (`quit`) ou app fermée pendant la partie (`closed`, détecté au lancement suivant). |
| **Interruptions** | Parties coupées par le minuteur ou le quota (`time-up`). Ce ne sont **pas** des abandons. |
| **Rejeux volontaires** | Parties lancées sur un niveau déjà réussi (≥ 1 étoile) avant le lancement. |
| **Meilleures étoiles** | Maximum d'étoiles sur les parties terminées. |
| **Temps de jeu** | Somme des durées de manches (hors écrans de transition). |

Étoiles d'une partie : `misses` = manches non réussies du premier coup. 3 étoiles si `misses ≤ maxMissesFor3` (défaut 0),
2 étoiles si `misses ≤ maxMissesFor2` (défaut 1), sinon 1. Terminer rapporte toujours au moins 1 étoile.

## 8. Contrôle parental

- **Code parent** : 4 chiffres, stocké haché (SHA-256 avec sel). Si le code est oublié, une multiplication d'adulte (ex. 17 × 23) permet de le réinitialiser.
- **Accès** : appui long de 2 s sur le cadenas de l'écran profils, puis saisie du code. Un tap bref ne fait rien.
- **Minuteur de session** (par enfant, en minutes) : compte le temps actif (app visible, profil sélectionné, carte ou partie).
  Chaque enfant a sa propre session. Elle reprend s'il revient dans les 10 minutes, donc passer par le profil de sa sœur ne remet pas le compteur à zéro.
  À l'échéance, la manche en cours se termine (60 s maximum), puis l'écran de fin s'affiche et la partie passe en `time-up`.
- **Quota quotidien** (par enfant) : même mécanisme, cumulé sur la journée locale.
- **Écran de fin** : visuel calme (lune, sans texte), persisté (`settings.lock`). Ni un rechargement, ni le bouton retour Android, ni la navigation directe ne le contournent.
  Après le code parent, le parent choisit : +5 min, +15 min (minutes bonus du jour) ou retour aux profils.
- **Hors périmètre** : empêcher de quitter l'app. C'est l'épinglage d'écran Android qui s'en charge.

## 9. Règles UX pour l'enfant non lectrice

- Aucun texte nécessaire dans les écrans enfant : pictos, couleurs, animations. Les textes de l'espace parent sont en français.
- Cibles tactiles : ≥ 72 px pour les choix de jeu, ≥ 56 px pour la navigation. Tap uniquement, pas de glisser-déposer
  — exceptions : `sort` (le trieur magique) et `builder` (le constructeur) acceptent le glisser-déposer **et** le tap
  (sélectionner puis taper la cible équivaut à y déposer l'objet/la pièce), pour rester jouables même sans geste de
  glissé maîtrisé. Dans `builder`, un emplacement peut être visuellement plus petit que 72 px (la silhouette doit
  rester fidèle à la figure) : sa zone tapable est alors agrandie en creux, en restant centrée sur lui.
- Erreur jamais punitive : son doux, léger tremblement, le choix se grise, on réessaie. Aucune vie, aucun compte à rebours visible, aucune récompense aléatoire.
- Sons obligatoires : réussite, erreur douce, étoile gagnée.
- Éléments interactifs qui attirent l'œil : la case à compléter pulse, les choix sont grands et contrastés.
- Pas de zoom, pas de sélection de texte, pas de menu contextuel, pas de tirer-pour-rafraîchir.

## 10. Conventions

- Identifiants de code en anglais ; textes affichés au parent et documentation en français.
- Logique pure (engine, générateurs de mécaniques) couverte par des tests Vitest (`*.test.ts` à côté du code).
- Les fichiers marqués `CONTRAT` sont la frontière entre modules. On les modifie volontairement, jamais en passant.
- Vérifications avant de livrer : `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`.
