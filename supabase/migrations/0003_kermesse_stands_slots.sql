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

DROP POLICY IF EXISTS kermesse_stands_select_authenticated ON kermesse_stands;
CREATE POLICY kermesse_stands_select_authenticated
  ON kermesse_stands FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS kermesse_stands_write_admin ON kermesse_stands;
CREATE POLICY kermesse_stands_write_admin
  ON kermesse_stands FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS slots
ALTER TABLE kermesse_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kermesse_slots_select_authenticated ON kermesse_slots;
CREATE POLICY kermesse_slots_select_authenticated
  ON kermesse_slots FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS kermesse_slots_write_admin ON kermesse_slots;
CREATE POLICY kermesse_slots_write_admin
  ON kermesse_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));
