-- KERMESSE — Horaires personnalisés par journée d'un événement.
--
-- Permet de définir des horaires d'ouverture/fermeture différents pour
-- une journée précise d'un événement multi-jours.
-- Règle de priorité : horaire personnalisé > horaire par défaut de l'événement.

CREATE TABLE IF NOT EXISTS kermesse_event_day_schedules (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES kermesse_events(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  open_time  TIME        NOT NULL,
  close_time TIME        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT kermesse_day_schedules_time_check CHECK (close_time > open_time),
  UNIQUE (event_id, date)
);

CREATE INDEX IF NOT EXISTS kermesse_day_schedules_event_idx
  ON kermesse_event_day_schedules (event_id);

ALTER TABLE kermesse_event_day_schedules ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés.
DROP POLICY IF EXISTS kermesse_day_schedules_select_authenticated ON kermesse_event_day_schedules;
CREATE POLICY kermesse_day_schedules_select_authenticated
  ON kermesse_event_day_schedules FOR SELECT
  TO authenticated USING (TRUE);

-- Écriture : admins uniquement.
DROP POLICY IF EXISTS kermesse_day_schedules_write_admin ON kermesse_event_day_schedules;
CREATE POLICY kermesse_day_schedules_write_admin
  ON kermesse_event_day_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );
