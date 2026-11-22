# Spec — Petits Lecteurs : l'app de lecture pour la maternelle

Lot du 22/11/2026. Cadre : [README.md](README.md), [HUB.md](HUB.md), [LECTURE.md](LECTURE.md) (le programme de
lecture, inchangé), [CARTE-MONDES.md](CARTE-MONDES.md) (le décor de la carte, réutilisé).

## 1. Décisions du PM

- « Une nouvelle app dédiée à la lecture, uniquement pour la maternelle » : proposition plus claire pour le go to
  market, développement plus simple.
- « Toute la logique de gestion parentale doit rester identique » : code parent, fiches enfant, minuteur et quota,
  fin douce, statistiques, export et import sont **le même code** que Petits Malins.
- « Un hub avec les mini-jeux, et l'aventure se concentre uniquement sur les exercices de lecture. »
- « Un mode admin pour moi, qui me permet de voir tous les niveaux débloqués. »

## 2. Une base de code, deux apps

La variante est fixée au build (`src/app/flavor.ts`, variable `VITE_APP_FLAVOR`, fichier `.env.lecture`) :

| | Petits Malins | Petits Lecteurs |
|---|---|---|
| Commandes | `npm run dev`, `npm run build` → `dist/` | `npm run dev:lecture`, `npm run build:lecture` → `dist-lecture/` |
| Parcours proposés | tous (MS, CE1) | `ms` seulement, affiché « Maternelle » au parent |
| Aventure (tuile carte du hub) | carte des niveaux de compétences | **carte des niveaux de lecture** (§3) |
| Mini-jeux du hub | ceux du parcours | coloriage, memory, ranger, labyrinthe, robot |
| Base IndexedDB | `petits-malins` | `petits-lecteurs` |
| Publication (GitHub Pages) | `/<repo>/` | `/<repo>/lecture/` |

- Deux bases distinctes : les deux apps peuvent être servies depuis la même origine sans mélanger leurs données. Le
  format d'export est le même : un export de Petits Malins s'importe dans Petits Lecteurs (les parties hors lecture
  sont gardées, simplement pas affichées).
- Le service worker de Petits Malins ne sert jamais sa page à la place de `lecture/` (`navigateFallbackDenylist`).
- Mêmes icônes et même charte pour l'instant.

## 3. L'aventure

- Hub → tuile carte → `#/map` → `ReadingMap` (`src/screens/adventure/`) : les 104 niveaux de `LEVELS`
  (LECTURE.md §16) sur le chemin des mondes (forêt, mer, montagne, nuages, puis on reboucle), chacun en médaillon
  de lecture (couleur de sa piste, lettre ou picto du jeu). L'avatar se pose sur le niveau en cours ; le panneau
  d'arrivée dans un nouveau monde se joue une fois (`profile.seenWorld`).
- Toucher un niveau ouvert → `#/reading/<niveau>` : la séance démarre tout de suite (pas d'accueil du programme).
  Maison de la séance (`to-map`) et coche de fin → retour à la carte (ancre d'historique `map`, sans empiler).
- Un niveau verrouillé tremble ; voix absente ou son coupé : picto `speaker-off` sur la carte, médaillons
  inactifs, badge sur la tuile carte du hub (même vérification que la lecture).
- La lecture n'est pas une tuile de jeu libre : elle est toujours visible (`visibleGameIds`), le parent ne peut pas la
  masquer. Son réglage « Étape de départ » est dans le bloc « Aventure de lecture » de la fiche enfant.

## 4. Espace parent

Identique, avec trois adaptations d'affichage : pas de choix de parcours (un seul), « Maternelle » comme libellé du
parcours, et pas de bloc « Carte du parcours » ni de compteurs de parties de niveaux dans les statistiques (Petits
Lecteurs n'a pas de carte de compétences). Le bloc « J'apprends à lire » (niveau en cours, items, confusions, banc
d'écoute) reste la source des statistiques de lecture.

## 5. Mode admin

- `AppSettings.adminUnlockAll` (absent = désactivé, propre au téléphone, jamais exporté).
- Caché : onglet Réglages de l'espace parent, **7 tapes sur le nom de l'app** en bas de l'onglet font apparaître le
  bloc « Mode admin ». Il reste visible tant qu'il est actif.
- Effet : tous les niveaux sont ouverts pour tous les enfants du téléphone, dans les deux apps — carte de lecture
  (état `open`, contour pointillé), accueil du programme de lecture, carte de compétences et lancement d'un niveau
  (`computeLevelStates(…, { unlockAll })`). Une clé s'affiche en haut de la carte de lecture tant qu'il est actif.
- Les séances jouées en mode admin sont enregistrées comme les autres : tester avec un profil dédié.

## 6. Tests

- Unitaires : variantes et registre (`games/index.test.ts`), route `#/reading/<niveau>` et ancre `map`
  (`routes.test.ts`), `unlockAll` (`engine/progress.test.ts`, `reading/levels.test.ts`).
- E2E : projet Playwright `lecture` (`tests/e2e/lecture/`, build `--mode lecture` sur son propre port) : hub et base
  propres, niveau joué depuis la carte, espace parent, mode admin, voix absente.

## 7. Questions ouvertes

1. Nom, icône et couleurs de l'app (provisoire : « Petits Lecteurs », charte de Petits Malins).
2. Mini-jeux : ceux de maternelle existants, sans lien avec la lecture. Des mini-jeux de lecture (memory des lettres,
   coloriage par son) renforceraient la proposition.
3. Fin du chemin : le 104e niveau tombe dans le 2e monde de la mer (trésor), pas au château de nuages.
