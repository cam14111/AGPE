-- KERMESSE — Événements (multi-éditions, une seule active à la fois)

-- Dépendance : les policies ci-dessous référencent kermesse_user_roles.
-- Garde idempotente pour permettre l'exécution dans l'ordre numérique
-- (la définition canonique + RLS de cette table reste dans 0005_kermesse_user_roles.sql).
CREATE TABLE IF NOT EXISTS kermesse_user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'volunteer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
DROP POLICY IF EXISTS kermesse_events_select_authenticated ON kermesse_events;
CREATE POLICY kermesse_events_select_authenticated
  ON kermesse_events FOR SELECT
  TO authenticated USING (TRUE);

-- Écriture : admins uniquement
DROP POLICY IF EXISTS kermesse_events_insert_admin ON kermesse_events;
CREATE POLICY kermesse_events_insert_admin
  ON kermesse_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS kermesse_events_update_admin ON kermesse_events;
CREATE POLICY kermesse_events_update_admin
  ON kermesse_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS kermesse_events_delete_admin ON kermesse_events;
CREATE POLICY kermesse_events_delete_admin
  ON kermesse_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );
