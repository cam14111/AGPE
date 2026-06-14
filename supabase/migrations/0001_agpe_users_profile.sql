-- AGPE — Profil utilisateur commun à toutes les apps de l'association
-- Ce fichier ne doit être exécuté qu'une fois pour tout le projet AGPE.

CREATE TABLE IF NOT EXISTS agpe_users_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  child_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agpe_users_profile_user_id_idx
  ON agpe_users_profile(user_id);

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
