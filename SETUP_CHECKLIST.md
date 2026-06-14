# Checklist Setup — Avant de lancer Claude Code
> Vérifications à faire **une seule fois**, manuellement, dans les dashboards
> Supabase et GitHub. Claude Code ne peut pas faire ces actions à ta place.

---

## 1. Supabase — Dashboard

### Auth → URL Configuration

**Redirect URLs** — ajouter exactement ces deux entrées :
```
http://localhost:5173/**
https://cam14111.github.io/AGPE/**
```
> ⚠️ Le `/**` est obligatoire (wildcard). Sans lui, le magic link échouera.

**Site URL** (champ "Site URL") :
```
https://cam14111.github.io/AGPE
```

---

### Auth → Email Templates (optionnel mais recommandé)

Personnaliser le template "Magic Link" en français :

**Sujet** :
```
Votre lien de connexion AGPE
```

**Corps** (HTML minimal) :
```html
<p>Bonjour,</p>
<p>Cliquez sur le lien ci-dessous pour vous connecter à l'espace bénévoles de la kermesse AGPE :</p>
<p><a href="{{ .ConfirmationURL }}">Me connecter</a></p>
<p>Ce lien est valable 1 heure. Si vous n'avez pas demandé cette connexion, ignorez cet email.</p>
<p>L'équipe AGPE</p>
```

---

### Settings → API

Récupérer et noter pour le `.env` :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon / public` key → `VITE_SUPABASE_ANON_KEY`

> Ne jamais utiliser la `service_role` key dans une app frontend.

---

### Database → Extensions (vérification)

S'assurer que ces extensions sont activées (elles le sont par défaut) :
- `uuid-ossp` → pour `gen_random_uuid()`
- `pg_net` → si tu veux activer les notifications plus tard

---

## 2. GitHub — Repo `cam14111/AGPE`

### Settings → Pages

| Paramètre | Valeur attendue |
|-----------|----------------|
| Source | **GitHub Actions** (pas "Deploy from a branch") |
| Visibilité du repo | **Public** (GitHub Pages gratuit = repo public obligatoire) |

> Si le repo est privé, GitHub Pages nécessite un plan GitHub Pro ou Teams.

---

### Settings → Secrets → Actions

Ajouter exactement ces 3 secrets (sensibles à la casse) :

| Nom du secret | Valeur |
|---------------|--------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon publique Supabase |
| `VITE_ADMIN_EMAIL` | Email du premier administrateur |

> Ces secrets seront injectés comme variables d'environnement lors du build
> GitHub Actions. Sans eux, le workflow échouera.

---

## 3. Exécuter les migrations Supabase

Deux méthodes (choisir une) :

### Méthode A — Supabase CLI (recommandée)
```bash
# Installation Supabase CLI
pnpm add -g supabase

# Lier au projet
supabase login
supabase link --project-ref <project-id>

# Appliquer les migrations
supabase db push
```

### Méthode B — Dashboard Supabase (sans CLI)
1. Ouvrir Supabase → **SQL Editor**
2. Copier-coller le contenu de chaque fichier `supabase/migrations/` dans l'ordre :
   - `0001_agpe_users_profile.sql`
   - `0002_kermesse_events.sql`
   - `0003_kermesse_stands_slots.sql`
   - `0004_kermesse_signups.sql`
   - `0005_kermesse_user_roles.sql`
   - `0006_kermesse_triggers.sql`
   - `0007_kermesse_bootstrap_fn.sql`
3. Cliquer **Run** après chaque fichier
4. Vérifier l'absence d'erreur avant de passer au suivant

> Les migrations sont idempotentes : elles peuvent être ré-exécutées sans dommage.

---

## 4. Variables d'environnement locales

Créer le fichier `.env` à la racine du monorepo (jamais commité) :
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_EMAIL=ton.email@exemple.fr
```

Vérifier que `.gitignore` contient bien :
```gitignore
.env
.env.local
.env.*.local
```

---

## 5. Générer les types TypeScript Supabase

Après avoir appliqué les migrations, générer les types :
```bash
pnpm supabase gen types typescript \
  --project-id <project-id> \
  > shared/types/supabase.ts
```

> À régénérer après chaque modification du schéma.

---

## 6. Checklist finale avant `git push`

- [ ] Supabase Auth : redirect URLs configurées (localhost + GitHub Pages)
- [ ] Supabase Auth : Site URL configurée
- [ ] Migrations exécutées sans erreur (toutes les 7 tables/fonctions présentes)
- [ ] Types TypeScript générés dans `shared/types/supabase.ts`
- [ ] Fichier `.env` créé et rempli localement
- [ ] GitHub Pages : source = "GitHub Actions"
- [ ] GitHub Secrets : 3 secrets ajoutés
- [ ] Repo GitHub : visibilité = Public
- [ ] `pnpm install` sans erreur en local
- [ ] `pnpm --filter kermesse dev` démarre sans erreur
- [ ] Connexion magic link testée en local avec ton email admin

---

## 7. Premier test de bout en bout (avant déploiement)

```
1. Lancer l'app en local : pnpm --filter kermesse dev
2. Aller sur http://localhost:5173/#/login
3. Saisir l'email défini dans VITE_ADMIN_EMAIL
4. Cliquer "Recevoir mon lien"
5. Ouvrir le lien reçu par email → doit rediriger vers /#/auth/callback
6. Vérifier la redirection vers /#/admin/dashboard
7. Dans Supabase → Table Editor → kermesse_user_roles : vérifier la ligne admin créée
8. Créer un événement test, un stand, un créneau
9. Se déconnecter
10. Se connecter avec un autre email (bénévole) → doit arriver sur /#/volunteer/stands
11. S'inscrire sur le créneau créé → vérifier le toast de confirmation
12. Vérifier dans /#/volunteer/planning que l'inscription apparaît
```
