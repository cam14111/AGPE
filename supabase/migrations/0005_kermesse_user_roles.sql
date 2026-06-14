-- KERMESSE — Rôles applicatifs (admin / volunteer)
CREATE TABLE IF NOT EXISTS kermesse_user_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK (role IN ('admin', 'volunteer')), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS kermesse_user_roles_user_id_idx ON kermesse_user_roles(user_id);
ALTER TABLE kermesse_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY kermesse_roles_select_own ON kermesse_user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
