# Mettre l'app en ligne et l'installer sur Android

Durée : environ 15 minutes la première fois. Ensuite, chaque modification poussée sur `main` est publiée toute seule.

## 1. Point bloquant à trancher : le dépôt est privé

GitHub Pages n'est **gratuit que pour les dépôts publics**. Pour un dépôt privé, il faut un compte GitHub Pro
(environ 4 $/mois). Même dans ce cas, le **site publié reste public** : toute personne qui connaît l'URL peut l'ouvrir.

| Option | Coût | Ce qui devient visible |
|---|---|---|
| **A. Rendre le dépôt public** (recommandé) | Gratuit | Le code et le contenu pédagogique. Aucune donnée des enfants : elles ne quittent jamais le téléphone. |
| B. Garder le dépôt privé + GitHub Pro | ~4 $/mois | Seulement le site (public de toute façon). |

Option A : *Settings → General → Danger Zone → Change repository visibility → Public*.
Avant de rendre public : le dépôt ne contient ni prénom, ni photo, ni secret. Garde cette règle pour la suite.

## 2. Créer la branche `main`

Le dépôt n'a encore qu'une branche de travail (`claude/accessible-projects-nd46nr`). La publication se déclenche sur `main`.

1. Onglet **Code → Branches → New branch**. Nom : `main`, source : `claude/accessible-projects-nd46nr`.
2. **Settings → General → Default branch** : choisir `main`.

## 3. Activer GitHub Pages

1. **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Onglet **Actions → Deploy → Run workflow** (branche `main`). Ou n'importe quel push sur `main`.
3. Attendre la coche verte (2 à 3 minutes). L'URL s'affiche dans le job `deploy` :
   **https://edouardkolf.github.io/educative-app/**

Le workflow (`.github/workflows/deploy.yml`) lance les tests et la validation du contenu **avant** de publier.
Un niveau JSON invalide bloque la publication : la version en ligne reste la précédente, qui fonctionne.

## 4. Installer sur le téléphone Android

1. Ouvrir l'URL dans **Chrome** (pas dans le navigateur intégré d'une autre app).
2. Menu **⋮ → Installer l'application** (selon la version : *Ajouter à l'écran d'accueil → Installer*).
3. Lancer l'app depuis l'icône : elle s'ouvre en plein écran, sans barre d'adresse.
4. Premier lancement : bouton « Commencer : espace parent ». On y crée le code parent, puis on ajoute les deux enfants.
5. Dans l'espace parent, vérifier **« Stockage protégé ✓ »**. Si ce n'est pas le cas, relancer l'app depuis l'icône installée.
6. Test hors ligne : mode avion, fermer puis rouvrir l'app. Elle doit fonctionner normalement.

## 5. Épingler l'app (empêcher l'enfant d'en sortir)

Géré par Android, pas par l'app :
1. **Paramètres → Sécurité et confidentialité → Plus de paramètres de sécurité → Épinglage d'application** : activer,
   ainsi que « Demander le code avant de retirer l'épinglage ».
   Sur Samsung : *Sécurité et confidentialité → Autres paramètres de sécurité → Épingler les applications*.
2. Ouvrir l'app, puis afficher les applis récentes, toucher l'icône au-dessus de la fenêtre de l'app, puis **Épingler**.
3. Pour retirer l'épinglage : balayer vers le haut et maintenir, ou, avec 3 boutons, maintenir *Retour* + *Aperçu*.

## 6. Au quotidien

- **Mises à jour** : l'app vérifie s'il existe une nouvelle version à chaque lancement et se recharge seule quelques secondes après.
- **Sauvegarde** : les données vivent dans Chrome sur ce téléphone. *Espace parent → Exporter la progression* avant
  de changer de téléphone ou d'effacer les données de Chrome. L'import (étape 3 du plan) restaure le fichier.
- **Ajouter un niveau** : voir `docs/CONTENU.md`. On crée un fichier JSON, on l'ajoute au parcours, on pousse sur `main`.

## Pour développer en local (optionnel)

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # tests unitaires + validation du contenu
npm run test:e2e     # parcours complet dans un Chrome mobile simulé
```
