-- KERMESSE — Fonction RPC : promotion du premier admin
-- Appelée depuis le frontend après chaque login magic link.
-- Idempotente : sans effet si un admin existe déjà.
-- SECURITY DEFINER : contourne RLS pour écrire dans kermesse_user_roles.

CREATE OR REPLACE FUNCTION kermesse_bootstrap_admin(admin_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INT;
BEGIN
  SELECT COUNT(*) INTO v_admin_count
  FROM kermesse_user_roles
  WHERE role = 'admin';

  IF v_admin_count > 0 THEN
    RETURN FALSE;
  END IF;

  IF auth.email() IS DISTINCT FROM admin_email THEN
    RETURN FALSE;
  END IF;

  INSERT INTO kermesse_user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE VIEW kermesse_slot_fill_rate AS
SELECT
  sl.id AS slot_id,
  sl.stand_id,
  sl.start_time,
  sl.end_time,
  sl.max_volunteers,
  COUNT(sg.id) AS current_count,
  sl.max_volunteers - COUNT(sg.id) AS remaining,
  CASE WHEN COUNT(sg.id) >= sl.max_volunteers THEN TRUE ELSE FALSE END AS is_full
FROM kermesse_slots sl
LEFT JOIN kermesse_signups sg ON sg.slot_id = sl.id
GROUP BY sl.id;
