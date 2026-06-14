-- KERMESSE — Correctif : ambiguïté "user_id" dans les fonctions RETURNS TABLE.
-- Les colonnes de sortie (user_id, role) entraient en conflit avec les colonnes
-- non préfixées du contrôle d'accès admin (erreur Postgres 42702). On qualifie
-- via un alias de table (kur).

CREATE OR REPLACE FUNCTION kermesse_admin_list_members()
RETURNS TABLE (
  user_id    UUID,
  email      TEXT,
  first_name TEXT,
  last_name  TEXT,
  role       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kermesse_user_roles kur
    WHERE kur.user_id = auth.uid() AND kur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    p.first_name,
    p.last_name,
    r.role
  FROM auth.users u
  LEFT JOIN agpe_users_profile p ON p.user_id = u.id
  LEFT JOIN kermesse_user_roles r ON r.user_id = u.id
  ORDER BY (r.role = 'admin') DESC NULLS LAST, u.email;
END;
$$;

CREATE OR REPLACE FUNCTION kermesse_admin_signup_details(p_event_id UUID)
RETURNS TABLE (
  signup_id   UUID,
  created_at  TIMESTAMPTZ,
  user_id     UUID,
  email       TEXT,
  first_name  TEXT,
  last_name   TEXT,
  stand_id    UUID,
  stand_name  TEXT,
  slot_id     UUID,
  start_time  TIME,
  end_time    TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kermesse_user_roles kur
    WHERE kur.user_id = auth.uid() AND kur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs.';
  END IF;

  RETURN QUERY
  SELECT
    sg.id,
    sg.created_at,
    sg.user_id,
    au.email::TEXT,
    pr.first_name,
    pr.last_name,
    st.id,
    st.name,
    sl.id,
    sl.start_time,
    sl.end_time
  FROM kermesse_signups sg
  JOIN kermesse_slots  sl ON sl.id = sg.slot_id
  JOIN kermesse_stands st ON st.id = sl.stand_id
  LEFT JOIN auth.users au ON au.id = sg.user_id
  LEFT JOIN agpe_users_profile pr ON pr.user_id = sg.user_id
  WHERE st.event_id = p_event_id
  ORDER BY st.name, sl.start_time, au.email;
END;
$$;
