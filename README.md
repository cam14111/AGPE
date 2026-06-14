# AGPE — App Kermesse

Monorepo pnpm pour les applications de l'Association de Gestion des Parents d'Élèves. La première application, `kermesse`, permet de gérer les événements, stands, créneaux et inscriptions bénévoles avec React, Vite, TypeScript strict, Tailwind CSS et Supabase.

## Démarrage local

```bash
pnpm install
cp .env.example .env
pnpm --filter kermesse dev
```

Renseigner dans `.env` :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

## Scripts

```bash
pnpm --filter kermesse build
pnpm --filter kermesse typecheck
```

## Structure

- `apps/kermesse/` : SPA React/Vite publiée sur GitHub Pages avec `HashRouter`.
- `shared/` : client Supabase unique et contexte d'authentification partagé.
- `supabase/migrations/` : schéma SQL idempotent avec RLS, rôles et trigger de capacité.
- `.github/workflows/deploy.yml` : build et déploiement GitHub Pages.

## Supabase

Appliquer les migrations dans l'ordre :

1. `0001_agpe_users_profile.sql`
2. `0002_kermesse_events.sql`
3. `0003_kermesse_stands_slots.sql`
4. `0004_kermesse_signups.sql`
5. `0005_kermesse_user_roles.sql`
6. `0006_kermesse_triggers.sql`
7. `0007_kermesse_bootstrap_fn.sql`

Le premier utilisateur connecté avec `VITE_ADMIN_EMAIL` est promu automatiquement via la RPC `kermesse_bootstrap_admin`.

## Conventions AGPE

| Convention            | Règle                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| Préfixe tables DB     | `<appname>_`, par exemple `kermesse_`                                   |
| Préfixe policies RLS  | `<appname>_<table>_<action>`                                            |
| Préfixe fonctions RPC | `<appname>_`                                                            |
| Package shared        | `@agpe/shared`                                                          |
| Client Supabase       | Toujours importé depuis `@agpe/shared`, jamais réinstancié dans une app |
| Auth                  | Commune à toutes les apps AGPE                                          |
| Langue interface      | Français                                                                |
| Migrations            | Dossier commun `supabase/migrations/`                                   |

## Déploiement GitHub Pages

Le dépôt est configuré pour déployer automatiquement l'application Kermesse sur GitHub Pages via `.github/workflows/deploy.yml`.

### Pré-requis GitHub

Dans **Settings → Pages** :

- Source : **GitHub Actions**

Dans **Settings → Secrets and variables → Actions**, ajouter :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

### Déclenchement

Le workflow se lance :

- automatiquement à chaque push sur `main` ;
- manuellement via l'action **Deploy Kermesse to GitHub Pages** grâce à `workflow_dispatch`.

### Pipeline

Le workflow :

1. installe pnpm et Node.js 20 ;
2. installe les dépendances avec `pnpm install --frozen-lockfile` ;
3. exécute `pnpm --filter kermesse typecheck` ;
4. exécute `pnpm --filter kermesse build` ;
5. publie `apps/kermesse/dist` comme artifact GitHub Pages.

L'application utilise `HashRouter` et `base: '/AGPE/'`, ce qui la rend compatible avec l'URL de production `https://cam14111.github.io/AGPE/`.

### Premier déploiement

Pour publier la première version :

```bash
git push origin main
```

Puis vérifier l'exécution de **Deploy Kermesse to GitHub Pages** dans l'onglet **Actions**.

Si vous voulez lancer le déploiement sans nouveau commit, ouvrez **Actions → Deploy Kermesse to GitHub Pages → Run workflow** et choisissez la branche `main`.

Une fois le job terminé, l'application sera disponible sur :

```text
https://cam14111.github.io/AGPE/
```
