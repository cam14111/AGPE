# AGPE — Monorepo

Monorepo pnpm des applications de l'**AGPE** (Association de Gestion des Parents
d'Élèves). Première application : **Kermesse**, un outil de gestion des bénévoles
de la kermesse annuelle (inscription aux créneaux, tableau de bord organisateur,
export CSV).

- **Production** : <https://cam14111.github.io/AGPE/>
- **Stack** : React + Vite + TypeScript · Tailwind CSS + shadcn/ui · Supabase
  (Auth magic link + PostgreSQL + RLS) · déploiement GitHub Pages via GitHub Actions.

---

## Structure du monorepo

```
AGPE/
├── apps/
│   └── kermesse/          App React/Vite (interface bénévole + admin)
├── shared/                Code partagé entre apps (@agpe/shared)
│   ├── supabase-client.ts Instance Supabase UNIQUE (jamais réinstanciée ailleurs)
│   ├── auth/              AuthProvider + useAuth (session + rôle)
│   └── types/supabase.ts  Types générés de la base
├── supabase/
│   ├── migrations/        Schéma SQL idempotent (0001 → 0007)
│   └── functions/         Edge Functions (stub notifications)
└── .github/workflows/     Déploiement GitHub Pages
```

---

## Prérequis

- **Node.js** ≥ 20
- **pnpm** 9 (`corepack enable` ou `npm i -g pnpm@9`)
- Un projet **Supabase** provisionné (voir `SETUP_CHECKLIST.md`)

---

## Démarrage local

```bash
# 1. Installer les dépendances (à la racine du monorepo)
pnpm install

# 2. Créer le fichier .env à la racine (jamais commité)
cp .env.example .env
#    puis renseigner VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_EMAIL

# 3. Lancer l'app en développement
pnpm --filter kermesse dev      # http://localhost:5173/AGPE/

# 4. Build de production
pnpm --filter kermesse build    # → apps/kermesse/dist/
```

> Les variables d'environnement sont lues à la racine du monorepo par Vite.
> Voir `.env.example` pour le modèle. Ne jamais committer `.env`.

---

## Base de données Supabase

Les migrations se trouvent dans `supabase/migrations/`, numérotées et **idempotentes**
(ré-exécutables sans erreur). Les appliquer **dans l'ordre** (0001 → 0007).

### Avec la CLI Supabase (recommandé)

```bash
supabase login
supabase link --project-ref <project-id>
supabase db push
```

### Sans CLI (SQL Editor)

Copier-coller le contenu de chaque fichier `0001` → `0007` dans l'éditeur SQL
Supabase, dans l'ordre, et exécuter.

### Générer les types TypeScript

Après toute modification du schéma :

```bash
pnpm supabase gen types typescript --project-id <project-id> \
  > shared/types/supabase.ts
```

> Le fichier `shared/types/supabase.ts` versionné est une définition manuelle
> fidèle aux migrations ; la commande ci-dessus la remplace par la version
> générée contre le projet réel.

### Vue d'ensemble du schéma

| Objet | Rôle |
|-------|------|
| `agpe_users_profile` | Profil parent commun à toutes les apps AGPE (optionnel) |
| `kermesse_events` | Éditions de la kermesse — une seule active (index partiel) |
| `kermesse_stands` | Stands d'activité d'une édition |
| `kermesse_slots` | Créneaux horaires d'un stand (capacité `max_volunteers`) |
| `kermesse_signups` | Inscriptions bénévoles (UNIQUE par créneau + utilisateur) |
| `kermesse_user_roles` | Rôle applicatif (`admin` / `volunteer`) |
| `kermesse_slot_fill_rate()` (RPC) | Taux de remplissage par créneau (compteurs globaux) |
| `kermesse_check_slot_capacity()` (trigger) | Empêche le dépassement de capacité (atomique) |
| `kermesse_bootstrap_admin()` (RPC) | Promeut le premier admin (idempotent) |
| `kermesse_ensure_volunteer_role()` (RPC) | Attribue le rôle bénévole au nouvel utilisateur |
| `kermesse_admin_signup_details()` (RPC) | Détail des inscriptions (email + nom) — admins uniquement |
| `kermesse_admin_list_members()` (RPC) | Liste des membres + rôle — admins uniquement |
| `kermesse_admin_set_role()` (RPC) | Promotion/rétrogradation, garde « au moins 1 admin » — admins uniquement |

---

## Authentification

- **Magic link** par email (aucun mot de passe).
- Le client utilise le flux **PKCE** : le lien revient avec `?code=…`
  (query string), compatible avec le `HashRouter` (`#/auth/callback`).
- Au premier login avec `VITE_ADMIN_EMAIL`, l'utilisateur est promu **admin**
  automatiquement (fonction `kermesse_bootstrap_admin`, sans effet si un admin existe).
- Tout autre parent obtient le rôle **volunteer**.

| Route | Accès |
|-------|-------|
| `/login`, `/auth/callback` | Public |
| `/volunteer/*`, `/profil` | Authentifié (admin ou bénévole) |
| `/admin/*` | Admin uniquement |

---

## Déploiement (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` build et déploie automatiquement à
chaque push sur `main`.

**Avant le premier push**, configurer dans GitHub → *Settings* :

- *Pages* → Source = **GitHub Actions**, repo **public**
- *Secrets and variables → Actions* → ajouter :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ADMIN_EMAIL`

Et dans Supabase → *Auth → URL Configuration* :

- Redirect URLs : `http://localhost:5173/**` et `https://cam14111.github.io/AGPE/**`
- Site URL : `https://cam14111.github.io/AGPE`

Détails complets dans `SETUP_CHECKLIST.md`.

---

## Conventions AGPE (futures apps)

| Convention | Règle |
|------------|-------|
| Préfixe tables DB | `<appname>_` (ex : `kermesse_`, `cotisations_`, `votes_`) |
| Préfixe policies RLS | `<appname>_<table>_<action>` |
| Préfixe fonctions RPC | `<appname>_` |
| Package partagé | `@agpe/shared` (importé par toutes les apps) |
| Client Supabase | Toujours importé depuis `@agpe/shared/supabase-client` — jamais réinstancié |
| Auth | Commune à tout le projet AGPE — un parent = un compte unique |
| Migrations | `supabase/migrations/` commun au monorepo |
| Langue de l'interface | Français |

---

## Documentation projet

- `PRD.md` — exigences produit & user stories
- `ARCHITECTURE.md` — décisions techniques (ADR) & schémas
- `CODING_GUIDELINES.md` — conventions de code obligatoires
- `UI_DESIGN_SPEC.md` — design system & composants
- `SETUP_CHECKLIST.md` — checklist de configuration Supabase / GitHub
