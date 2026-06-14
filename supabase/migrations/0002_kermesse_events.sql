-- KERMESSE — Événements (multi-éditions, une seule active à la fois)
CREATE TABLE IF NOT EXISTS kermesse_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, date DATE NOT NULL, location TEXT, description TEXT, start_time TIME, end_time TIME, is_active BOOLEAN NOT NULL DEFAULT FALSE, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS kermesse_events_one_active_idx ON kermesse_events (is_active) WHERE is_active = TRUE;
ALTER TABLE kermesse_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY kermesse_events_select_authenticated ON kermesse_events FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY kermesse_events_insert_admin ON kermesse_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY kermesse_events_update_admin ON kermesse_events FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY kermesse_events_delete_admin ON kermesse_events FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));
