-- KERMESSE — Ajout de la date du créneau dans le détail admin des inscriptions.
-- Les créneaux portent une colonne `date` depuis la migration 0016. L'export CSV
-- a besoin de cette date pour afficher le jour des stands ouverts sur plusieurs
-- jours. On recrée donc kermesse_admin_signup_details en ajoutant slot_date.

DROP FUNCTION IF EXISTS kermesse_admin_signup_details(UUID);
CREATE FUNCTION kermesse_admin_signup_details(p_event_id UUID)
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
  slot_date   DATE,
  start_time  TIME,
  end_time    TIME,
  status      TEXT
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
    sl.date,
    sl.start_time,
    sl.end_time,
    sg.status
  FROM kermesse_signups sg
  JOIN kermesse_slots  sl ON sl.id = sg.slot_id
  JOIN kermesse_stands st ON st.id = sl.stand_id
  LEFT JOIN auth.users au ON au.id = sg.user_id
  LEFT JOIN agpe_users_profile pr ON pr.user_id = sg.user_id
  WHERE st.event_id = p_event_id
  ORDER BY st.name, sl.date, sl.start_time, (sg.status = 'reserved') DESC, sg.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION kermesse_admin_signup_details(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kermesse_admin_signup_details(UUID) TO authenticated;
