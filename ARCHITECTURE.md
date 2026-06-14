# Architecture — App Kermesse AGPE
**Version** : 1.0  
**Statut** : Validé  

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Pages                             │
│              https://cam14111.github.io/AGPE/                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React SPA (Vite + HashRouter)               │   │
│  │                                                          │   │
│  │   apps/kermesse/src/                                     │   │
│  │   ├── pages/admin/     ← CRUD événements, stands, slots  │   │
│  │   ├── pages/volunteer/ ← Liste stands, Mon planning      │   │
│  │   └── pages/auth/      ← Login, Callback                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                    │ HTTPS / supabase-js                        │
└────────────────────┼────────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────────┐
        │         Supabase AGPE         │
        │                               │
        │  ┌──────────┐  ┌───────────┐  │
        │  │  Auth    │  │ PostgreSQL │  │
        │  │ (Magic   │  │  + RLS    │  │
        │  │  link)   │  │           │  │
        │  └──────────┘  └───────────┘  │
        │                               │
        │  ┌──────────────────────────┐ │
        │  │   Edge Functions (stub)  │ │
        │  │   kermesse-send-confirm  │ │
        │  └──────────────────────────┘ │
        └───────────────────────────────┘
```

---

## 2. Structure du monorepo

```
AGPE/                               ← racine du monorepo pnpm
│
├── apps/
│   └── kermesse/                   ← App 1 : gestion kermesse
│       ├── src/
│       │   ├── components/
│       │   │   ├── admin/          ← Composants réservés admin
│       │   │   │   ├── EventForm.tsx
│       │   │   │   ├── StandForm.tsx
│       │   │   │   ├── SlotForm.tsx
│       │   │   │   ├── FillRateCard.tsx
│       │   │   │   └── CsvExportButton.tsx
│       │   │   ├── volunteer/      ← Composants bénévoles
│       │   │   │   ├── StandCard.tsx
│       │   │   │   ├── SlotRow.tsx
│       │   │   │   └── MySchedule.tsx
│       │   │   └── shared/         ← Composants communs dans l'app
│       │   │       ├── PageHeader.tsx
│       │   │       ├── LoadingSkeleton.tsx
│       │   │       └── ErrorMessage.tsx
│       │   ├── pages/
│       │   │   ├── admin/
│       │   │   │   ├── Dashboard.tsx
│       │   │   │   ├── Events.tsx
│       │   │   │   ├── Stands.tsx
│       │   │   │   └── Slots.tsx
│       │   │   ├── volunteer/
│       │   │   │   ├── StandsList.tsx
│       │   │   │   └── MyPlanning.tsx
│       │   │   ├── auth/
│       │   │   │   ├── Login.tsx
│       │   │   │   └── Callback.tsx
│       │   │   └── Profile.tsx
│       │   ├── hooks/
│       │   │   ├── useActiveEvent.ts   ← Récupère l'événement actif
│       │   │   ├── useStands.ts
│       │   │   ├── useSlots.ts
│       │   │   ├── useSignups.ts
│       │   │   └── useMySignups.ts
│       │   ├── lib/
│       │   │   ├── csv-export.ts       ← Génération CSV client-side
│       │   │   ├── date-utils.ts       ← Comparaisons de dates
│       │   │   └── role-guard.ts       ← Vérification des rôles
│       │   ├── router.tsx              ← HashRouter + routes protégées
│       │   └── main.tsx
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── components.json             ← shadcn/ui config
│       └── package.json
│
├── shared/                         ← Code partagé entre futures apps
│   ├── supabase-client.ts          ← Instance Supabase UNIQUE
│   ├── auth/
│   │   ├── AuthProvider.tsx        ← Context React global
│   │   └── useAuth.ts              ← Hook : session, rôle, loading
│   └── package.json                ← name: "@agpe/shared"
│
├── supabase/
│   └── migrations/
│       ├── 0001_agpe_users_profile.sql
│       ├── 0002_kermesse_events.sql
│       ├── 0003_kermesse_stands_slots.sql
│       ├── 0004_kermesse_signups.sql
│       ├── 0005_kermesse_user_roles.sql
│       ├── 0006_kermesse_triggers.sql
│       └── 0007_kermesse_bootstrap_fn.sql
│
├── .github/workflows/deploy.yml
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── README.md
```

---

## 3. Flux d'authentification (magic link)

```
Parent (mobile)          App React              Supabase Auth
      │                      │                       │
      │  Saisit son email     │                       │
      │─────────────────────►│                       │
      │                      │ signInWithOtp({email}) │
      │                      │──────────────────────►│
      │                      │   { data, error }      │
      │                      │◄──────────────────────│
      │  Toast : "Vérifiez   │                       │
      │  vos emails"         │                       │
      │◄─────────────────────│                       │
      │                      │                       │
      │  [clic sur le lien reçu par email]            │
      │                      │                       │
      │  GET /#/auth/callback │                       │
      │─────────────────────►│                       │
      │                      │ getSession()           │
      │                      │──────────────────────►│
      │                      │  { session, user }     │
      │                      │◄──────────────────────│
      │                      │                       │
      │                      │ rpc('kermesse_bootstrap_admin',
      │                      │     { admin_email: env.ADMIN_EMAIL })
      │                      │──────────────────────►│
      │                      │  { data: true/false }  │
      │                      │◄──────────────────────│
      │                      │                       │
      │                      │ SELECT role FROM kermesse_user_roles
      │                      │ WHERE user_id = auth.uid()
      │                      │──────────────────────►│
      │                      │  { role: 'admin' | 'volunteer' | null }
      │                      │◄──────────────────────│
      │                      │                       │
      │                      │ [si null → INSERT volunteer]
      │                      │──────────────────────►│
      │                      │                       │
      │  Redirect selon rôle  │                       │
      │  admin → /admin/dashboard                     │
      │  volunteer → /volunteer/stands                │
      │◄─────────────────────│                       │
```

---

## 4. Flux d'inscription bénévole (avec trigger DB)

```
Bénévole            React UI            Supabase JS         PostgreSQL
    │                   │                    │                    │
    │  Clic "S'inscrire" │                   │                    │
    │──────────────────►│                   │                    │
    │                   │ État : loading=true│                    │
    │                   │ from kermesse_signups                   │
    │                   │ INSERT {slot_id, user_id}               │
    │                   │───────────────────►│                    │
    │                   │                   │ INSERT kermesse_signups
    │                   │                   │───────────────────►│
    │                   │                   │                    │ BEFORE INSERT
    │                   │                   │                    │ kermesse_check_slot_capacity()
    │                   │                   │                    │
    │                   │        ┌──────────────────────────────►│
    │                   │        │ [capacité OK]                  │
    │                   │        │          │  INSERT accepté     │
    │                   │        │          │◄───────────────────│
    │                   │        │ { data } │                    │
    │                   │        │◄─────────│                    │
    │  Toast ✓ "Inscrit" │       │                               │
    │◄──────────────────│        │                               │
    │  Bouton → "Se désinscrire" │                               │
    │                   │        │                               │
    │                   │        │ [créneau complet]             │
    │                   │        │          │  RAISE EXCEPTION   │
    │                   │        │          │◄───────────────────│
    │                   │        │ { error: "Créneau complet" }  │
    │                   │        │◄─────────│                    │
    │  Toast ✗ "Ce créneau│      │                               │
    │  vient d'être complet"│                                    │
    │◄──────────────────│                                        │
```

---

## 5. Schéma de données (ERD simplifié)

```
auth.users (Supabase)
    │ id (UUID)
    │
    ├──────────────────┬──────────────────────┬────────────────────
    │                  │                      │
    ▼                  ▼                      ▼
agpe_users_profile  kermesse_user_roles   kermesse_signups
  user_id (FK)        user_id (FK)            user_id (FK)
  first_name          role                    slot_id (FK)───┐
  last_name           ('admin'|'volunteer')   created_at     │
  phone                                                      │
  child_class                                                │
                                                             │
kermesse_events ─────────────────────────────────────       │
  id (PK)                                                    │
  name                                          ┌────────────┘
  date                                          │
  is_active (UNIQUE WHERE TRUE)                 ▼
  created_by (FK → auth.users)           kermesse_slots
    │                                      id (PK)
    │ 1:N                                  stand_id (FK)───┐
    ▼                                      start_time      │
kermesse_stands                            end_time        │
  id (PK)                                  max_volunteers  │
  event_id (FK)                                            │
  name                                  ┌──────────────────┘
  emoji                                 │
  location_detail                       │ N:1
    │ 1:N                               ▼
    └──────────────────────────── kermesse_stands
                                   (déjà décrit ci-dessus)
```

**Relations critiques :**
- `kermesse_events` → `kermesse_stands` : 1:N (un événement a plusieurs stands)
- `kermesse_stands` → `kermesse_slots` : 1:N (un stand a plusieurs créneaux)
- `kermesse_slots` → `kermesse_signups` : 1:N (un créneau a plusieurs inscrits)
- `auth.users` → `kermesse_signups` : 1:N (un utilisateur peut s'inscrire sur plusieurs créneaux)
- Contrainte : `UNIQUE(slot_id, user_id)` sur `kermesse_signups`

---

## 6. Architecture Decision Records (ADR)

### ADR-001 — HashRouter plutôt que BrowserRouter
**Statut** : Accepté  
**Contexte** : GitHub Pages sert des fichiers statiques. Une route comme `/admin/dashboard` 
retournerait une 404 si le serveur ne connaît pas la route.  
**Décision** : Utiliser `HashRouter` — toutes les routes sont préfixées par `#`
(`/#/admin/dashboard`), ce qui est géré entièrement côté client.  
**Conséquences** : URLs moins "propres" mais déploiement sans configuration serveur.

---

### ADR-002 — Schéma `public` avec préfixe `kermesse_`
**Statut** : Accepté  
**Contexte** : Supabase expose via PostgREST le schéma `public` par défaut.
L'ajout d'un schéma dédié (`kermesse`) nécessiterait une configuration PostgREST
supplémentaire dans le dashboard Supabase.  
**Décision** : Toutes les tables dans le schéma `public`, préfixées par `kermesse_`.
Convention extensible aux futures apps (`cotisations_`, `votes_`…).  
**Conséquences** : Zéro configuration PostgREST supplémentaire. Lisibilité
assurée par le préfixe.

---

### ADR-003 — Trigger PostgreSQL pour la capacité max
**Statut** : Accepté  
**Contexte** : La vérification côté application (RLS ou frontend) est vulnérable
aux race conditions : deux bénévoles qui cliquent simultanément peuvent tous deux
passer si le check se fait avant que l'INSERT de l'autre soit commité.  
**Décision** : `BEFORE INSERT` trigger avec `SELECT ... FOR UPDATE` sur le créneau.
La contrainte est atomique et indépendante du frontend.  
**Conséquences** : Le frontend doit interpréter l'exception PostgreSQL et afficher
un message lisible.

---

### ADR-004 — Profil utilisateur optionnel
**Statut** : Accepté  
**Contexte** : Forcer le remplissage du profil après le magic link ajoute une
étape qui fait abandonner les parents moins techniques.  
**Décision** : `agpe_users_profile` est optionnelle. Un bannière non bloquante
invite à compléter le profil. Les exports CSV utilisent l'email comme fallback.  
**Conséquences** : Certains exports afficheront des emails plutôt que des noms.
Acceptable pour un contexte associatif où les organisateurs se connaissent.

---

### ADR-005 — Client Supabase unique dans `shared/`
**Statut** : Accepté  
**Contexte** : Un projet AGPE mutualisé avec plusieurs apps. Si chaque app
initialise son propre client Supabase, on multiplie les connexions et on risque
des conflits de session.  
**Décision** : `shared/supabase-client.ts` exporte un singleton.
Toutes les apps importent depuis `@agpe/shared`.  
**Conséquences** : Toute modification du client (version, options) est centralisée.
Ne jamais importer `createClient` directement dans une app.

---

## 7. Dépendances clés

| Package | Version cible | Rôle |
|---------|--------------|------|
| `react` | 18.x | Framework UI |
| `react-router-dom` | 6.x | HashRouter + routes protégées |
| `@supabase/supabase-js` | 2.x | Client Supabase |
| `tailwindcss` | 3.x | Styles utilitaires |
| `shadcn/ui` | latest | Composants accessibles |
| `typescript` | 5.x | Typage strict |
| `vite` | 5.x | Bundler + dev server |
| `pnpm` | 9.x | Package manager monorepo |
