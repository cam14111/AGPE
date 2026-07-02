-- KERMESSE — Optimisation des policies RLS (advisors Supabase du 02/07/2026).
-- Idempotent et ré-exécutable. Aucun changement de droits : mêmes règles,
-- seulement plus rapides à évaluer.
--
-- 1) Lint auth_rls_initplan : `auth.uid()` était ré-évalué pour CHAQUE ligne.
--    L'envelopper dans `(SELECT auth.uid())` le fait évaluer une seule fois
--    par requête (InitPlan). Appliqué aux 15 policies concernées.
-- 2) Lint multiple_permissive_policies : sur stands, slots, stand_days et
--    event_day_schedules, la policy admin `FOR ALL` ajoutait une seconde
--    policy permissive sur SELECT (en plus de la lecture « authenticated »,
--    déjà universelle). On la remplace par trois policies d'écriture
--    (INSERT / UPDATE / DELETE) : le SELECT n'est plus évalué deux fois.
-- 3) Lint unindexed_foreign_keys : index sur kermesse_events.created_by.

-- Prédicat admin réutilisé partout (le sous-select sur kermesse_user_roles ne
-- lit que la ligne de l'appelant : compatible avec la RLS "select_own").

-- ---------------------------------------------------------------------------
-- agpe_users_profile
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS agpe_profile_select_own ON agpe_users_profile;
CREATE POLICY agpe_profile_select_own
  ON agpe_users_profile FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS agpe_profile_insert_own ON agpe_users_profile;
CREATE POLICY agpe_profile_insert_own
  ON agpe_users_profile FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS agpe_profile_update_own ON agpe_users_profile;
CREATE POLICY agpe_profile_update_own
  ON agpe_users_profile FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- kermesse_events (lecture déjà simple : USING TRUE, rien à changer)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_events_insert_admin ON kermesse_events;
CREATE POLICY kermesse_events_insert_admin
  ON kermesse_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS kermesse_events_update_admin ON kermesse_events;
CREATE POLICY kermesse_events_update_admin
  ON kermesse_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS kermesse_events_delete_admin ON kermesse_events;
CREATE POLICY kermesse_events_delete_admin
  ON kermesse_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- kermesse_stands : FOR ALL admin → 3 policies d'écriture
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_stands_write_admin ON kermesse_stands;

DROP POLICY IF EXISTS kermesse_stands_insert_admin ON kermesse_stands;
CREATE POLICY kermesse_stands_insert_admin
  ON kermesse_stands FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_stands_update_admin ON kermesse_stands;
CREATE POLICY kermesse_stands_update_admin
  ON kermesse_stands FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_stands_delete_admin ON kermesse_stands;
CREATE POLICY kermesse_stands_delete_admin
  ON kermesse_stands FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- kermesse_slots : FOR ALL admin → 3 policies d'écriture
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_slots_write_admin ON kermesse_slots;

DROP POLICY IF EXISTS kermesse_slots_insert_admin ON kermesse_slots;
CREATE POLICY kermesse_slots_insert_admin
  ON kermesse_slots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_slots_update_admin ON kermesse_slots;
CREATE POLICY kermesse_slots_update_admin
  ON kermesse_slots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_slots_delete_admin ON kermesse_slots;
CREATE POLICY kermesse_slots_delete_admin
  ON kermesse_slots FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- kermesse_stand_days : FOR ALL admin → 3 policies d'écriture
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_stand_days_write_admin ON kermesse_stand_days;

DROP POLICY IF EXISTS kermesse_stand_days_insert_admin ON kermesse_stand_days;
CREATE POLICY kermesse_stand_days_insert_admin
  ON kermesse_stand_days FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_stand_days_update_admin ON kermesse_stand_days;
CREATE POLICY kermesse_stand_days_update_admin
  ON kermesse_stand_days FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_stand_days_delete_admin ON kermesse_stand_days;
CREATE POLICY kermesse_stand_days_delete_admin
  ON kermesse_stand_days FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- kermesse_event_day_schedules : FOR ALL admin → 3 policies d'écriture
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_day_schedules_write_admin ON kermesse_event_day_schedules;

DROP POLICY IF EXISTS kermesse_day_schedules_insert_admin ON kermesse_event_day_schedules;
CREATE POLICY kermesse_day_schedules_insert_admin
  ON kermesse_event_day_schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_day_schedules_update_admin ON kermesse_event_day_schedules;
CREATE POLICY kermesse_day_schedules_update_admin
  ON kermesse_event_day_schedules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles
                      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_day_schedules_delete_admin ON kermesse_event_day_schedules;
CREATE POLICY kermesse_day_schedules_delete_admin
  ON kermesse_event_day_schedules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- kermesse_signups
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_signups_select ON kermesse_signups;
CREATE POLICY kermesse_signups_select
  ON kermesse_signups FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (SELECT 1 FROM kermesse_user_roles
               WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS kermesse_signups_insert_volunteer ON kermesse_signups;
CREATE POLICY kermesse_signups_insert_volunteer
  ON kermesse_signups FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS kermesse_signups_delete ON kermesse_signups;
CREATE POLICY kermesse_signups_delete
  ON kermesse_signups FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (SELECT 1 FROM kermesse_user_roles
               WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- kermesse_user_roles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_roles_select_own ON kermesse_user_roles;
CREATE POLICY kermesse_roles_select_own
  ON kermesse_user_roles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- kermesse_signup_audit
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS kermesse_audit_select_admin ON kermesse_signup_audit;
CREATE POLICY kermesse_audit_select_admin
  ON kermesse_signup_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_audit_delete_admin ON kermesse_signup_audit;
CREATE POLICY kermesse_audit_delete_admin
  ON kermesse_signup_audit FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles
                 WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- Index manquant sur la FK kermesse_events.created_by
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS kermesse_events_created_by_idx
  ON kermesse_events (created_by);
