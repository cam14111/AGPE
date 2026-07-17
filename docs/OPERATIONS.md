# Exploitation & sécurité — Événements AGPE

Guide opérationnel de l'application en production
(<https://cam14111.github.io/AGPE/>). Tout est hébergé sur des offres
**100 % gratuites** : GitHub Pages (front) + Supabase Free (base + auth).
Dernière vérification des limites : 02/07/2026.

---

## 1. Le risque n° 1 : la mise en pause Supabase

**Supabase Free met un projet en pause après 7 jours sans requête API.**
L'app ayant un usage saisonnier (kermesse annuelle), c'est le principal risque
opérationnel : app inutilisée en janvier = projet en pause = page de connexion
qui échoue.

### Prévention automatique

Le workflow [`supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml)
envoie une requête anodine à l'API REST **une fois par jour** (06:47 UTC).
La requête utilise la clé publique `anon` et ne renvoie aucune donnée (RLS) —
elle compte simplement comme de l'activité API. La doc Supabase précise que la
pause vise les projets à « activité faible » sur 7 jours et que « quelques
requêtes par jour » suffisent typiquement : le rythme quotidien se place dans
cette zone.

Deux limites à connaître :

1. **GitHub désactive les workflows planifiés après 60 jours sans commit** sur
   le dépôt. Vous recevrez un e-mail « scheduled workflow disabled » :
   cliquez simplement **Enable workflow** dans l'onglet *Actions* du dépôt.
   Un commit (même mineur) réarme aussi le compteur.
2. Si le ping échoue, le workflow apparaît en rouge dans *Actions* et GitHub
   envoie un e-mail d'échec — c'est le signal pour vérifier le projet.

### Réactivation manuelle (si le projet est quand même en pause)

1. Se connecter à <https://supabase.com/dashboard>.
2. Ouvrir le projet **AGPE** (réf. `lxquhbxkjtgvyaaidyuv`).
3. Cliquer **Restore project** et attendre 2–3 minutes.
4. Vérifier que <https://cam14111.github.io/AGPE/> permet de se connecter.

Aucune donnée n'est perdue pendant une pause ; seul l'accès API est suspendu.
**Avant chaque campagne d'inscriptions**, un réflexe sain : ouvrir l'app et se
connecter une fois pour vérifier que tout répond.

---

## 2. Sauvegardes

> ⚠️ L'offre Supabase Free **n'inclut aucune sauvegarde automatique**.
> Les sauvegardes ci-dessous + les migrations versionnées dans Git sont les
> seules protections des données.

### État des sauvegardes (02/07/2026)

| Quoi | Où | Contenu |
|------|-----|---------|
| Code de prod (avant travaux) | branche `backup/2026-07-02-avant-travaux` sur `cam14111/AGPE` | `main` @ `ca9cf1a` |
| Code de prod (copie hors-site) | branche `backup/2026-07-02-agpe-main-prod` sur `cam14111/Kermesse` | `main` @ `ca9cf1a` |
| Base de données | schéma `backup_20260702` dans la base Supabase elle-même | les 9 tables applicatives avec données + snapshot `auth.users` (3 comptes) + snapshot des 21 migrations (SQL complet) |

Le schéma `backup_20260702` n'est **pas exposé** par l'API (PostgREST ne sert
que `public`) et ne contient aucun secret. Ne le supprimer qu'une fois une
sauvegarde plus récente en place (`DROP SCHEMA backup_20260702 CASCADE;`).

### Refaire une sauvegarde des données (SQL Editor Supabase)

```sql
-- Adapter la date du schéma. Copie table par table :
CREATE SCHEMA backup_YYYYMMDD;
CREATE TABLE backup_YYYYMMDD.agpe_users_profile           AS SELECT * FROM public.agpe_users_profile;
CREATE TABLE backup_YYYYMMDD.kermesse_user_roles          AS SELECT * FROM public.kermesse_user_roles;
CREATE TABLE backup_YYYYMMDD.kermesse_events              AS SELECT * FROM public.kermesse_events;
CREATE TABLE backup_YYYYMMDD.kermesse_stands              AS SELECT * FROM public.kermesse_stands;
CREATE TABLE backup_YYYYMMDD.kermesse_stand_days          AS SELECT * FROM public.kermesse_stand_days;
CREATE TABLE backup_YYYYMMDD.kermesse_slots               AS SELECT * FROM public.kermesse_slots;
CREATE TABLE backup_YYYYMMDD.kermesse_event_day_schedules AS SELECT * FROM public.kermesse_event_day_schedules;
CREATE TABLE backup_YYYYMMDD.kermesse_signups             AS SELECT * FROM public.kermesse_signups;
CREATE TABLE backup_YYYYMMDD.kermesse_signup_audit        AS SELECT * FROM public.kermesse_signup_audit;
CREATE TABLE backup_YYYYMMDD.auth_users_snapshot          AS SELECT id, email, raw_user_meta_data, created_at FROM auth.users;
```

---

## 3. Rollback (restauration)

### Code

Chaque déploiement correspond à un commit de `main`. Pour revenir en arrière :

```bash
git checkout main
git reset --hard <commit-sûr>     # ex. ca9cf1a = état du 02/07/2026
git push --force-with-lease origin main
# → le workflow deploy.yml republie automatiquement l'ancienne version
```

### Données (depuis le SQL Editor, en cas de perte/corruption)

```sql
BEGIN;
ALTER TABLE public.kermesse_signups DISABLE TRIGGER USER;

TRUNCATE public.kermesse_signup_audit, public.kermesse_signups,
         public.kermesse_event_day_schedules, public.kermesse_slots,
         public.kermesse_stand_days, public.kermesse_stands,
         public.kermesse_events, public.kermesse_user_roles,
         public.agpe_users_profile;

INSERT INTO public.agpe_users_profile           SELECT * FROM backup_20260702.agpe_users_profile;
INSERT INTO public.kermesse_user_roles          SELECT * FROM backup_20260702.kermesse_user_roles;
INSERT INTO public.kermesse_events              SELECT * FROM backup_20260702.kermesse_events;
INSERT INTO public.kermesse_stands              SELECT * FROM backup_20260702.kermesse_stands;
INSERT INTO public.kermesse_stand_days          SELECT * FROM backup_20260702.kermesse_stand_days;
INSERT INTO public.kermesse_slots               SELECT * FROM backup_20260702.kermesse_slots;
INSERT INTO public.kermesse_event_day_schedules SELECT * FROM backup_20260702.kermesse_event_day_schedules;
INSERT INTO public.kermesse_signups             SELECT * FROM backup_20260702.kermesse_signups;
INSERT INTO public.kermesse_signup_audit        SELECT * FROM backup_20260702.kermesse_signup_audit;

ALTER TABLE public.kermesse_signups ENABLE TRIGGER USER;
COMMIT;
```

### Schéma

Rejouer les migrations `supabase/migrations/0001` → dernière (elles sont
idempotentes), ou récupérer le SQL exact d'une migration passée dans
`backup_20260702.schema_migrations_snapshot`.

### Annuler uniquement les migrations 0022/0023 (si besoin)

- **0022 (optimisation RLS)** : rejouer les policies d'origine des migrations
  `0001`–`0019` (les `DROP POLICY IF EXISTS` + `CREATE POLICY` d'origine
  restaurent l'ancien comportement — identique en droits, seulement moins
  optimisé).
- **0023 (anti-désinscription tardive)** :
  ```sql
  DROP TRIGGER IF EXISTS kermesse_block_late_unsignup ON kermesse_signups;
  DROP FUNCTION IF EXISTS kermesse_block_late_unsignup();
  ```

---

## 4. Avertissements « advisors » Supabase — état documenté

Dernier passage : 02/07/2026, après les migrations 0022/0023.

### Sécurité — 7 avertissements `SECURITY DEFINER` : **intentionnels**

Le linter signale que 7 fonctions `SECURITY DEFINER` sont exécutables par les
utilisateurs connectés (`authenticated`). C'est **voulu et sûr** : chaque
fonction est le point d'entrée officiel d'une opération qui doit contourner la
RLS, et **s'auto-protège** en vérifiant elle-même l'identité/le rôle de
l'appelant :

| Fonction | Pourquoi SECURITY DEFINER | Protection interne |
|----------|---------------------------|--------------------|
| `kermesse_bootstrap_admin(text)` | écrit dans `kermesse_user_roles` (aucune policy d'écriture) | sans effet si un admin existe déjà **et** si `auth.email()` ≠ email attendu |
| `kermesse_ensure_volunteer_role()` | idem | n'attribue que `volunteer`, uniquement à l'appelant (`auth.uid()`), no-op si un rôle existe |
| `kermesse_admin_list_members()` | lit `auth.users` (emails, non exposés par l'API) | `RAISE EXCEPTION` si l'appelant n'est pas admin |
| `kermesse_admin_set_role(uuid, text)` | écrit les rôles | admin obligatoire + garde « toujours ≥ 1 admin » |
| `kermesse_admin_signup_details(uuid)` | lit emails + profils de tous les bénévoles | `RAISE EXCEPTION` si l'appelant n'est pas admin |
| `kermesse_slot_fill_rate()` | compte TOUTES les inscriptions (la RLS limiterait un bénévole aux siennes) | ne renvoie que des compteurs agrégés, aucune donnée personnelle |
| `kermesse_admin_delete_member(uuid)` | supprime un compte dans `auth.users` (non accessible via l'API) | admin obligatoire + refuse soi-même et les administrateurs |

Toutes ont `SET search_path = public` (pas de détournement de résolution de
noms) et `EXECUTE` est révoqué pour `anon` (migration 0008). Les fonctions de
trigger (`kermesse_check_slot_capacity`, `kermesse_promote_replacement`,
`kermesse_block_late_unsignup`, fonctions d'audit) ne sont pas appelables via
l'API du tout (migrations 0012/0014/0023).

### Sécurité — « Leaked password protection disabled » : **sans objet**

La connexion se fait exclusivement par Google OAuth : aucun mot de passe n'est
stocké ni saisi. L'option peut être activée par principe dans
*Auth → Providers → Email* mais n'a aucun effet pratique.

### Performance : **traité** (migration 0022)

- 15 policies ré-évaluant `auth.uid()` ligne à ligne → `(SELECT auth.uid())` ;
- 4 tables avec double policy permissive sur SELECT → policies d'écriture
  séparées (INSERT/UPDATE/DELETE) ;
- FK `kermesse_events.created_by` indexée.

Restent des remarques **INFO** sans enjeu : « unused index » (index légitimes,
base encore petite) et « no primary key » sur les tables du schéma de
sauvegarde `backup_20260702` (copies figées, jamais requêtées).

---

## 5. Règles métier garanties par la base (pas seulement l'interface)

| Règle | Mécanisme |
|-------|-----------|
| Capacité max par créneau | trigger `BEFORE INSERT` + `SELECT … FOR UPDATE` (anti-concurrence) |
| Au-delà de la capacité → liste d'attente | statut `replacement` attribué par le trigger |
| Désistement → promotion du 1ᵉʳ remplaçant | trigger `AFTER DELETE` + journalisation |
| Pas deux créneaux qui se chevauchent (même jour, même événement) | trigger `BEFORE INSERT` |
| Un seul événement actif | index unique partiel sur `is_active` |
| Toujours au moins un admin | garde dans `kermesse_admin_set_role` |
| Une inscription max par créneau et par personne | contrainte `UNIQUE (slot_id, user_id)` |
| **Désinscription impossible après la fin du créneau** (sauf admin) | trigger `BEFORE DELETE` (migration 0023, heure de Paris) |
| Historique d'audit inviolable | insertions uniquement via triggers `SECURITY DEFINER` ; lecture/purge admin |

---

## 6. Limites connues (choix assumés)

- **Heure de référence** : la base juge un créneau « terminé » en heure de
  Paris (migration 0023) ; l'interface, elle, utilise l'heure de l'appareil.
  Pour un parent dont le téléphone n'est pas à l'heure de Paris (voyage,
  horloge déréglée), le bouton « Se désinscrire » peut apparaître alors que la
  base refusera (message clair affiché), ou disparaître un peu trop tôt. La
  base reste l'autorité ; impact jugé négligeable pour une école française.
- **Détection des erreurs métier côté client** : l'app reconnaît les refus de
  la base par le texte de l'exception (« Créneau passé », « Chevauchement »).
  Ces textes sont définis dans nos migrations : ne pas les reformuler sans
  adapter `useSignups.ts`, sinon l'utilisateur verra le message générique.
- **Prédicat admin répété dans les policies SQL** : chaque policy embarque son
  propre `EXISTS (… role = 'admin')` (style du projet depuis 0002). C'est
  volontaire : chaque policy reste autoportante et auditable ; une fonction
  partagée ajouterait une indirection dans du code de sécurité et un
  avertissement advisor de plus. En cas d'évolution du modèle de rôles,
  penser à mettre à jour toutes les policies (rechercher `role = 'admin'`).

---

## 7. Limites des offres gratuites (vérifiées le 02/07/2026)

- **Supabase Free** : 500 Mo de base (large : la base pèse < 20 Mo),
  50 000 utilisateurs actifs/mois, 5 Go d'egress, **max 2 projets actifs**
  (actuellement : `LMNP` + `AGPE`), pas de sauvegarde automatique, pause après
  7 jours sans requête API (voir § 1).
- **GitHub Pages** : dépôt public requis, site ≤ 1 Go, ~100 Go/mois de bande
  passante (limite souple), Actions illimitées pour les dépôts publics.

Au volume d'une association (quelques dizaines de bénévoles), aucune limite
n'est approchée.
