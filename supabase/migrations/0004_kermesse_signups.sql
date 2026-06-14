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
DROP POLICY IF EXISTS kermesse_signups_select ON kermesse_signups;
CREATE POLICY kermesse_signups_select
  ON kermesse_signups FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- INSERT : bénévoles uniquement, pour eux-mêmes
DROP POLICY IF EXISTS kermesse_signups_insert_volunteer ON kermesse_signups;
CREATE POLICY kermesse_signups_insert_volunteer
  ON kermesse_signups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE : l'utilisateur peut se désinscrire lui-même ; l'admin aussi
DROP POLICY IF EXISTS kermesse_signups_delete ON kermesse_signups;
CREATE POLICY kermesse_signups_delete
  ON kermesse_signups FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
