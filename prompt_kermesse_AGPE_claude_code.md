# Prompt Claude Code — App Kermesse AGPE
> Prompt prêt à l'emploi. Toutes les décisions d'architecture sont figées.
> Ne pas dévier sans validation explicite.

---

## Objectif

Implémenter une web app React/Vite déployée sur GitHub Pages pour gérer la
kermesse annuelle de l'AGPE (Association de Gestion des Parents d'Élèves).
Cette app est la **première d'un monorepo pnpm mutualisé** qui accueillera
d'autres apps AGPE à terme.

- **Repo GitHub** : `cam14111/AGPE` (repo public)
- **URL production** : `https://cam14111.github.io/AGPE/`
- **Projet Supabase** : `AGPE` (déjà provisionné)
- **Auth Supabase** : redirect URL `https://cam14111.github.io/AGPE/**` déjà configurée
- **GitHub Pages** : mode "Deploy from GitHub Actions" déjà activé

---

## Stack technique — décisions figées, ne pas dévier

| Couche | Choix retenu |
|--------|-------------|
| Frontend | React + Vite + TypeScript (strict mode) |
| Routing | `HashRouter` — SPA statique, compatible GitHub Pages |
| UI | shadcn/ui + Tailwind CSS — mobile-first, interface en français |
| Package manager | pnpm (workspaces monorepo) |
| Backend | Supabase : Auth + PostgreSQL + RLS + RPC |
| Schéma DB | `public` avec préfixe `kermesse_` sur toutes les tables |
| Hébergement | GitHub Pages (build statique, pas de SSR) |
| CI/CD | GitHub Actions |
| Auth | Magic link email (Supabase Auth) — pas de mot de passe |

---

## Structure du repo — monorepo pnpm

```
AGPE/
├── apps/
│   └── kermesse/                    ← App React/Vite principale
│       ├── src/
│       │   ├── components/          ← Composants UI kermesse
│       │   │   ├── admin/           ← Composants réservés admin
│       │   │   └── volunteer/       ← Composants bénévoles
│       │   ├── pages/               ← Pages/routes
│       │   ├── hooks/               ← Hooks React spécifiques kermesse
│       │   ├── lib/                 ← Utilitaires métier kermesse
│       │   └── main.tsx
│       ├── package.json
│       ├── vite.config.ts           ← base: '/AGPE/'
│       ├── tailwind.config.ts
│       ├── components.json          ← Config shadcn/ui
│       └── index.html
├── shared/                          ← Code partagé entre futures apps AGPE
│   ├── supabase-client.ts           ← Instance Supabase UNIQUE (pas de logique métier ici)
│   ├── auth/
│   │   ├── useAuth.ts               ← Hook auth commun
│   │   └── AuthProvider.tsx         ← Context provider
│   └── package.json                 ← name: "@agpe/shared"
├── supabase/
│   └── migrations/                  ← Fichiers SQL numérotés et commentés
├── .github/
│   └── workflows/
│       └── deploy.yml
├── pnpm-workspace.yaml
├── package.json                     ← Root workspace
├── .env                             ← Non versionné
├── .env.example                     ← Versionné
└── README.md
```

### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'shared'
```

### .env.example (à versionner tel quel)
```env
# Supabase — récupérer dans le dashboard Supabase > Settings > API
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Email du premier administrateur AGPE
# Cet email sera automatiquement promu admin à sa première connexion
# si aucun admin n'existe encore dans kermesse_user_roles
VITE_ADMIN_EMAIL=admin@exemple.fr
```

---

## Modèle de données — migrations SQL

Livrer dans `supabase/migrations/` avec ce nommage exact.
Chaque fichier doit être **idempotent** (`CREATE TABLE IF NOT EXISTS`,
`CREATE OR REPLACE FUNCTION`, etc.) et **commenté en en-tête**.

### Fichier `0001_agpe_users_profile.sql`
```sql
-- AGPE — Profil utilisateur commun à toutes les apps de l'association
-- Ce fichier ne doit être exécuté qu'une fois pour tout le projet AGPE.

CREATE TABLE IF NOT EXISTS agpe_users_profile (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  phone       TEXT,
  child_class TEXT,        -- ex : "CP-A", "CM2-B"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS agpe_users_profile_user_id_idx ON agpe_users_profile(user_id);

-- RLS
ALTER TABLE agpe_users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY agpe_profile_select_own
  ON agpe_users_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY agpe_profile_insert_own
  ON agpe_users_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY agpe_profile_update_own
  ON agpe_users_profile FOR UPDATE
  USING (auth.uid() = user_id);
```

### Fichier `0002_kermesse_events.sql`
```sql
-- KERMESSE — Événements (multi-éditions, une seule active à la fois)

CREATE TABLE IF NOT EXISTS kermesse_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  date        DATE        NOT NULL,
  location    TEXT,
  description TEXT,
  start_time  TIME,
  end_time    TIME,
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Contrainte : un seul événement actif à la fois (index partiel)
CREATE UNIQUE INDEX IF NOT EXISTS kermesse_events_one_active_idx
  ON kermesse_events (is_active)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE kermesse_events ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés
CREATE POLICY kermesse_events_select_authenticated
  ON kermesse_events FOR SELECT
  TO authenticated USING (TRUE);

-- Écriture : admins uniquement
CREATE POLICY kermesse_events_insert_admin
  ON kermesse_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY kermesse_events_update_admin
  ON kermesse_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY kermesse_events_delete_admin
  ON kermesse_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### Fichier `0003_kermesse_stands_slots.sql`
```sql
-- KERMESSE — Stands d'activités et créneaux horaires

CREATE TABLE IF NOT EXISTS kermesse_stands (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES kermesse_events(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  location_detail TEXT,        -- ex : "Salle des fêtes — côté jardin"
  emoji           TEXT,        -- ex : "🎯"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kermesse_stands_event_id_idx ON kermesse_stands(event_id);

CREATE TABLE IF NOT EXISTS kermesse_slots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stand_id       UUID        NOT NULL REFERENCES kermesse_stands(id) ON DELETE CASCADE,
  start_time     TIME        NOT NULL,
  end_time       TIME        NOT NULL,
  max_volunteers INT         NOT NULL DEFAULT 1 CHECK (max_volunteers >= 1),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kermesse_slots_stand_id_idx ON kermesse_slots(stand_id);

-- RLS stands
ALTER TABLE kermesse_stands ENABLE ROW LEVEL SECURITY;

CREATE POLICY kermesse_stands_select_authenticated
  ON kermesse_stands FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY kermesse_stands_write_admin
  ON kermesse_stands FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS slots
ALTER TABLE kermesse_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY kermesse_slots_select_authenticated
  ON kermesse_slots FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY kermesse_slots_write_admin
  ON kermesse_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));
```

### Fichier `0004_kermesse_signups.sql`
```sql
-- KERMESSE — Inscriptions bénévoles

CREATE TABLE IF NOT EXISTS kermesse_signups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id    UUID        NOT NULL REFERENCES kermesse_slots(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slot_id, user_id)            -- un bénévole = max 1 inscription par créneau
);

CREATE INDEX IF NOT EXISTS kermesse_signups_slot_id_idx  ON kermesse_signups(slot_id);
CREATE INDEX IF NOT EXISTS kermesse_signups_user_id_idx  ON kermesse_signups(user_id);

-- RLS
ALTER TABLE kermesse_signups ENABLE ROW LEVEL SECURITY;

-- SELECT : l'utilisateur voit ses propres inscriptions ; l'admin voit tout
CREATE POLICY kermesse_signups_select
  ON kermesse_signups FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- INSERT : bénévoles uniquement, pour eux-mêmes
CREATE POLICY kermesse_signups_insert_volunteer
  ON kermesse_signups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE : l'utilisateur peut se désinscrire lui-même ; l'admin aussi
CREATE POLICY kermesse_signups_delete
  ON kermesse_signups FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### Fichier `0005_kermesse_user_roles.sql`
```sql
-- KERMESSE — Rôles applicatifs (admin / volunteer)

CREATE TABLE IF NOT EXISTS kermesse_user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'volunteer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kermesse_user_roles_user_id_idx ON kermesse_user_roles(user_id);

-- RLS : lecture de son propre rôle uniquement
-- L'écriture est exclusivement contrôlée par les fonctions SECURITY DEFINER
ALTER TABLE kermesse_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY kermesse_roles_select_own
  ON kermesse_user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

### Fichier `0006_kermesse_triggers.sql`
```sql
-- KERMESSE — Trigger : contrainte capacité max par créneau
-- Appliqué AVANT INSERT pour empêcher tout dépassement, y compris
-- en cas de requêtes simultanées (race condition atténuée par FOR UPDATE).

CREATE OR REPLACE FUNCTION kermesse_check_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_count  INT;
  v_max_volunteers INT;
BEGIN
  -- Verrouillage du créneau pour éviter les race conditions
  SELECT max_volunteers INTO v_max_volunteers
  FROM kermesse_slots
  WHERE id = NEW.slot_id
  FOR UPDATE;

  SELECT COUNT(*) INTO v_current_count
  FROM kermesse_signups
  WHERE slot_id = NEW.slot_id;

  IF v_current_count >= v_max_volunteers THEN
    RAISE EXCEPTION 'Créneau complet : % bénévole(s) maximum pour ce créneau.',
      v_max_volunteers;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kermesse_enforce_slot_capacity ON kermesse_signups;
CREATE TRIGGER kermesse_enforce_slot_capacity
  BEFORE INSERT ON kermesse_signups
  FOR EACH ROW EXECUTE FUNCTION kermesse_check_slot_capacity();
```

### Fichier `0007_kermesse_bootstrap_fn.sql`
```sql
-- KERMESSE — Fonction RPC : promotion du premier admin
-- Appelée depuis le frontend après chaque login magic link.
-- Idempotente : sans effet si un admin existe déjà.
-- SECURITY DEFINER : contourne RLS pour écrire dans kermesse_user_roles.

CREATE OR REPLACE FUNCTION kermesse_bootstrap_admin(admin_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INT;
BEGIN
  -- Vérifier qu'il n'existe pas encore d'admin
  SELECT COUNT(*) INTO v_admin_count
  FROM kermesse_user_roles WHERE role = 'admin';

  IF v_admin_count > 0 THEN
    RETURN FALSE;   -- Admin déjà présent, rien à faire
  END IF;

  -- Vérifier que l'appelant est bien l'email attendu
  IF auth.email() IS DISTINCT FROM admin_email THEN
    RETURN FALSE;
  END IF;

  -- Promouvoir l'utilisateur courant en admin
  INSERT INTO kermesse_user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RETURN TRUE;
END;
$$;

-- Vue utilitaire : nombre d'inscrits par créneau (utilisée par le dashboard admin)
CREATE OR REPLACE VIEW kermesse_slot_fill_rate AS
SELECT
  sl.id                   AS slot_id,
  sl.stand_id,
  sl.start_time,
  sl.end_time,
  sl.max_volunteers,
  COUNT(sg.id)            AS current_count,
  sl.max_volunteers - COUNT(sg.id) AS remaining,
  CASE WHEN COUNT(sg.id) >= sl.max_volunteers THEN TRUE ELSE FALSE END AS is_full
FROM kermesse_slots sl
LEFT JOIN kermesse_signups sg ON sg.slot_id = sl.id
GROUP BY sl.id;
```

---

## Authentification — flux complet

### Login (magic link)
1. L'utilisateur saisit son email → `supabase.auth.signInWithOtp({ email })`
2. Supabase envoie le magic link → redirige vers `https://cam14111.github.io/AGPE/#/auth/callback`
3. Sur la page callback : `supabase.auth.getSession()` → session établie
4. Appel immédiat de `supabase.rpc('kermesse_bootstrap_admin', { admin_email: import.meta.env.VITE_ADMIN_EMAIL })`
5. Récupérer le rôle de l'utilisateur : `SELECT role FROM kermesse_user_roles WHERE user_id = auth.uid()`
6. Redirect selon le rôle :
   - `admin` → `/admin/dashboard`
   - `volunteer` ou aucun rôle → `/volunteer/stands`
   - Aucun rôle (nouveau parent) → insérer `{ user_id, role: 'volunteer' }` dans `kermesse_user_roles` → `/volunteer/stands`

### Profil utilisateur (optionnel)
- Ne pas bloquer la navigation
- Afficher un `<Banner>` shadcn/ui non intrusif : *"Complétez votre profil pour que les organisateurs vous retrouvent facilement"*
- Lien vers `/profil`
- Le banner disparaît dès que `agpe_users_profile.first_name` est renseigné

### Protection des routes
```
/admin/*        → accessible uniquement si role = 'admin'
/volunteer/*    → accessible si role = 'admin' ou 'volunteer'
/profil         → tout utilisateur authentifié
/login          → non authentifié uniquement
/auth/callback  → public (gestion du retour magic link)
```

---

## Fonctionnalités à implémenter

### Vue bénévole (`/volunteer/`)

**`/volunteer/stands`** — Vue principale
- Affiche l'événement actif (`is_active = TRUE`) : nom, date, lieu
- Liste les stands avec leurs créneaux
- Chaque créneau affiche :
  - Heure début → heure fin
  - Jauge de remplissage : `X / max_volunteers`
  - Badge coloré : 🟢 Places disponibles · 🔴 Complet
  - Bouton "S'inscrire" (désactivé si complet ou déjà inscrit)
- Gère l'erreur du trigger DB (créneau complet) avec un toast shadcn/ui

**`/volunteer/planning`** — Mon planning
- Récapitulatif des inscriptions de l'utilisateur connecté
- Groupé par stand puis par créneau
- Bouton "Se désinscrire" (masqué si la date de la kermesse est passée)

### Vue admin (`/admin/`)

**`/admin/dashboard`** — Tableau de bord
- Indicateurs clés (cards shadcn/ui) :
  - Total bénévoles inscrits
  - Créneaux complets / total créneaux
  - Stands sans aucun bénévole
  - Créneaux non pourvus
- Tableau consolidé : stand → créneau → inscrits (nom/email) → places restantes
- Bouton **"Exporter CSV"** (client-side, voir ci-dessous)

**`/admin/events`** — Gestion des événements
- CRUD complet
- Toggle `is_active` : activer une édition désactive automatiquement les autres
  (géré côté DB par l'index partiel — une UPDATE qui passe `is_active = TRUE`
  échouera si un autre event est déjà actif → gérer l'erreur côté UI)

**`/admin/stands`** — Gestion des stands
- CRUD complet (scoped sur l'événement actif)
- Formulaire : nom, description, emplacement, emoji (sélecteur simple)

**`/admin/slots`** — Gestion des créneaux
- CRUD complet par stand
- Formulaire : heure début, heure fin, max bénévoles

### Export CSV (client-side, aucun serveur)
```typescript
// Récupérer toutes les inscriptions avec JOIN
const { data } = await supabase
  .from('kermesse_signups')
  .select(`
    created_at,
    kermesse_slots (start_time, end_time,
      kermesse_stands (name,
        kermesse_events (name, date)
      )
    ),
    user_id
  `)

// Enrichir avec les emails via auth.users si possible,
// sinon utiliser agpe_users_profile (first_name, last_name)
// Générer le CSV via une fonction utilitaire maison (pas de lib externe)
// Déclencher le téléchargement via URL.createObjectURL + <a download>
```

---

## Notifications — stub uniquement

Créer le fichier `supabase/functions/kermesse-send-confirmation/index.ts` :

```typescript
// STUB — Edge Function non implémentée
//
// Objectif : envoyer un email de confirmation à chaque inscription bénévole.
//
// Pour activer :
// 1. Implémenter la logique d'envoi email (Resend, SendGrid, ou SMTP Supabase)
// 2. Créer un trigger Supabase sur INSERT dans kermesse_signups
//    qui appelle cette Edge Function via pg_net ou un webhook
// 3. Configurer les secrets : RESEND_API_KEY (ou équivalent)
//
// Schéma du payload attendu :
// {
//   user_email: string,
//   user_name: string,
//   stand_name: string,
//   slot_start: string,
//   slot_end: string,
//   event_name: string,
//   event_date: string
// }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (_req) => {
  // TODO: implémenter l'envoi d'email de confirmation
  return new Response('Not implemented', { status: 501 })
})
```

---

## GitHub Actions — `.github/workflows/deploy.yml`

```yaml
name: Deploy Kermesse to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build kermesse app
        run: pnpm --filter kermesse build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_ADMIN_EMAIL: ${{ secrets.VITE_ADMIN_EMAIL }}

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/kermesse/dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

> **Avant le premier push** : ajouter dans GitHub → Settings → Secrets → Actions :
> - `VITE_SUPABASE_URL`
> - `VITE_SUPABASE_ANON_KEY`
> - `VITE_ADMIN_EMAIL`

---

## Ordre d'implémentation — commit après chaque étape

Implémenter **dans cet ordre exact**, sans sauter d'étape :

| # | Étape | Commit message suggéré |
|---|-------|----------------------|
| 1 | Init monorepo pnpm (`pnpm-workspace.yaml`, root `package.json`, `shared/`, `.gitignore`, `.env.example`) | `chore: init pnpm monorepo AGPE` |
| 2 | Toutes les migrations SQL (`supabase/migrations/0001` → `0007`) | `feat(db): schema kermesse complet avec RLS et trigger` |
| 3 | Scaffold `apps/kermesse/` : Vite + React + TS + Tailwind + shadcn/ui + HashRouter | `feat(kermesse): scaffold app React/Vite` |
| 4 | `shared/supabase-client.ts` + `shared/auth/useAuth.ts` + `AuthProvider` | `feat(shared): client Supabase et hook auth` |
| 5 | Pages Login + callback magic link + guards de routes par rôle + bootstrap admin | `feat(auth): magic link, guards, bootstrap admin` |
| 6 | Layout global (Header, navigation admin/bénévole, routes) | `feat(layout): navigation et routing par rôle` |
| 7 | CRUD événements (`/admin/events`) | `feat(admin): gestion des événements` |
| 8 | CRUD stands (`/admin/stands`) | `feat(admin): gestion des stands` |
| 9 | CRUD créneaux (`/admin/slots`) | `feat(admin): gestion des créneaux` |
| 10 | Vue bénévole : liste stands/créneaux + inscription/désinscription | `feat(volunteer): inscription aux créneaux` |
| 11 | Vue "Mon planning" (`/volunteer/planning`) | `feat(volunteer): vue mon planning` |
| 12 | Dashboard admin avec indicateurs + vue consolidée | `feat(admin): tableau de bord` |
| 13 | Export CSV client-side | `feat(admin): export CSV des inscriptions` |
| 14 | Profil utilisateur optionnel + bannière non bloquante | `feat(profile): profil optionnel et bannière` |
| 15 | Stub Edge Function notifications | `feat(notifications): stub edge function confirmation` |
| 16 | GitHub Actions deploy workflow | `ci: workflow deploy GitHub Pages` |
| 17 | README.md complet | `docs: README setup local, Supabase, déploiement, conventions AGPE` |

---

## Critères d'acceptation

- [ ] `pnpm install && pnpm --filter kermesse dev` démarre sans erreur sur `localhost:5173`
- [ ] `pnpm --filter kermesse build` produit un build statique dans `apps/kermesse/dist/`
- [ ] Le magic link redirige vers `/#/auth/callback` et établit la session
- [ ] Premier login avec `VITE_ADMIN_EMAIL` → rôle `admin` attribué automatiquement
- [ ] Un admin peut créer un événement, l'activer, ajouter des stands et des créneaux
- [ ] Un seul événement peut avoir `is_active = TRUE` simultanément (erreur DB sinon)
- [ ] Un bénévole voit l'événement actif sans sélection manuelle
- [ ] Le trigger DB empêche tout dépassement de `max_volunteers` (testé avec 2 requêtes simultanées)
- [ ] Un bénévole ne peut pas se désinscrire après la date de la kermesse
- [ ] L'export CSV se télécharge client-side sans appel serveur
- [ ] Le workflow GitHub Actions déploie sur `https://cam14111.github.io/AGPE/`
- [ ] Toutes les migrations sont idempotentes (ré-exécutables sans erreur)
- [ ] `shared/supabase-client.ts` ne contient aucune logique métier
- [ ] Interface entièrement en français
- [ ] Application utilisable sur mobile (viewport 375px minimum)

---

## Conventions AGPE pour les futures apps (à documenter dans le README)

| Convention | Règle |
|------------|-------|
| Préfixe tables DB | `<appname>_` ex : `kermesse_`, `cotisations_`, `votes_` |
| Préfixe policies RLS | `<appname>_<table>_<action>` |
| Préfixe fonctions RPC | `<appname>_` |
| Package shared | `@agpe/shared` (importé par toutes les apps) |
| Client Supabase | Toujours importé depuis `@agpe/shared` — jamais réinstancié |
| Auth | Commune à tout le projet AGPE — un parent = un compte unique |
| Langue de l'interface | Français |
| Dossier migrations | `supabase/migrations/` commun au monorepo |
