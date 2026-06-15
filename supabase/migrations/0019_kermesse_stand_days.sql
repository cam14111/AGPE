-- KERMESSE — Jours d'ouverture d'un stand.
--
-- Un stand est rattaché à un événement et peut être ouvert sur un sous-ensemble
-- choisi des dates de l'événement. Cette table de jonction est la source de
-- vérité des journées d'ouverture (la colonne kermesse_stands.date est conservée
-- comme « première date d'ouverture » dénormalisée pour la rétrocompatibilité).

CREATE TABLE IF NOT EXISTS kermesse_stand_days (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stand_id   UUID        NOT NULL REFERENCES kermesse_stands(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stand_id, date)
);

CREATE INDEX IF NOT EXISTS kermesse_stand_days_stand_idx
  ON kermesse_stand_days (stand_id);

-- Backfill : chaque stand existant → un jour d'ouverture = sa date actuelle.
INSERT INTO kermesse_stand_days (stand_id, date)
SELECT id, date FROM kermesse_stands WHERE date IS NOT NULL
ON CONFLICT (stand_id, date) DO NOTHING;

ALTER TABLE kermesse_stand_days ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés.
DROP POLICY IF EXISTS kermesse_stand_days_select_authenticated ON kermesse_stand_days;
CREATE POLICY kermesse_stand_days_select_authenticated
  ON kermesse_stand_days FOR SELECT
  TO authenticated USING (TRUE);

-- Écriture : admins uniquement.
DROP POLICY IF EXISTS kermesse_stand_days_write_admin ON kermesse_stand_days;
CREATE POLICY kermesse_stand_days_write_admin
  ON kermesse_stand_days FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM kermesse_user_roles
            WHERE user_id = auth.uid() AND role = 'admin')
  );
