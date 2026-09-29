# Petits Malins — consignes pour Claude

PWA éducative (Vite + Preact + TypeScript) pour la maternelle et le CE1. Enfant non lecteur en MS : aucun texte à lire côté enfant.
La carte du code, le modèle de données et les conventions sont dans `docs/ARCHITECTURE.md` (§2 arborescence). Ne pas rescanner le dépôt : lire cette section d'abord.

## Où lire quoi (à la demande, pas en entier)

| Besoin | Fichier |
|---|---|
| Structure, moteur ↔ mécaniques, stats, conventions | `docs/ARCHITECTURE.md` (sections utiles seulement) |
| Ajouter ou modifier un niveau (JSON) | `docs/CONTENU.md`, `content/level.schema.json` |
| Hub, dictée, coloriage | `docs/specs/<JEU>.md` |
| Progression pédagogique | `docs/PROGRESSION-MS.md`, `docs/PROGRESSION-CE1.md` |

## Commandes

`npm run typecheck` · `npm test` (unitaires + validation du contenu) · `npm run build` · `npm run test:e2e`.
Pendant le travail, cibler : `npx vitest run <dossier>`. Lancer la suite complète (dont e2e) une seule fois avant de livrer.

## Règles du projet

- Identifiants en anglais ; textes visibles par le parent et docs en français.
- Logique pure couverte par des `*.test.ts` à côté du code.
- Les fichiers marqués `CONTRAT` sont la frontière entre modules : on ne les modifie que volontairement.
- Pas de nouvelle dépendance npm sans accord.
- Pas de commit ni de push sauf demande.

## Économie de contexte

- Ne jamais lister ni lire `content/levels/**`, `public/emoji/**`, `package-lock.json` : passer par `Grep` ciblé ou par les schémas.
- Lire un fichier par plage (`offset`/`limit`) dès qu'il dépasse ~300 lignes.
- Regrouper les appels d'outils indépendants dans un même tour.
- Chantier fini : suggérer `/clear` avant le suivant. Session longue (~100k tokens de contexte) : suggérer `/compact`.
- Ne pas changer de modèle en cours de session (le cache est perdu) : le choix se fait à l'ouverture.

## Délégation aux sous-agents (`.claude/agents/`)

Objectif : garder le contexte principal court. Un sous-agent démarre à froid, donc déléguer une petite tâche coûte plus cher que la faire.

**Faire soi-même** si la tâche tient en 1-2 fichiers connus, ou si elle demande du cadrage, un arbitrage produit ou de la conception.

**Déléguer** si la tâche est bornée, spécifiable par un contrat écrit, et qu'elle touche plus de ~3 fichiers ou produit beaucoup de sortie (logs de build, résultats de tests, exploration large) :

| Agent | Pour |
|---|---|
| `implementer` (sonnet) | Un module (mécanique, stockage, écran) contre un contrat, avec tests |
| `content-writer` (haiku) | Lots de niveaux/parcours JSON à partir d'une progression fournie |
| `scaffolder` (sonnet) | Outillage, config, CI |
| `qa-tester` (sonnet) | E2E Playwright, PWA, hors ligne |
| `reviewer` (opus) | Revue finale en lecture seule, une fois par chantier |
| `Explore` | Recherche large dans le code quand une réponse en 2-3 greps ne suffit pas |

Comment déléguer :
1. Écrire le contrat (types, signatures, fichiers attribués, critère de fin) avant de lancer ; ne pas laisser l'agent le deviner.
2. Un agent = un dossier attribué ; plusieurs agents en parallèle seulement si leurs dossiers ne se recoupent pas.
3. Demander un rapport court (≤ 25 lignes) : fichiers, API exposée, résultats de vérification, doutes.
4. Vérifier le rapport par `npm run typecheck` et `npx vitest run <dossier>`, sans relire tout le code produit.
5. Ne pas rejouer le travail de l'agent : en cas d'écart, renvoyer une correction ciblée.

Opus est réservé à la conception, aux arbitrages et à la revue. Le code courant vise Sonnet.
