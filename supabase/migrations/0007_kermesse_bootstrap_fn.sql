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
  -- Vérifier qu'il n'existe pas encore d'admin
  SELECT COUNT(*) INTO v_admin_count
  FROM kermesse_user_roles WHERE role = 'admin';

  IF v_admin_count > 0 THEN
    RETURN FALSE;   -- Admin déjà présent, rien à faire
  END IF;

  -- Vérifier que l'appelant est bien l'email attendu
  IF auth.email() IS DISTINCT FROM admin_email THEN
    RETURN FALSE;
  END IF;

  -- Promouvoir l'utilisateur courant en admin
  INSERT INTO kermesse_user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RETURN TRUE;
END;
$$;

-- KERMESSE — Fonction RPC : enregistrement du rôle bénévole pour l'utilisateur courant.
-- Appelée après le login pour les nouveaux parents (aucun rôle existant).
-- L'écriture dans kermesse_user_roles est réservée aux fonctions SECURITY DEFINER ;
-- cette fonction ne peut attribuer QUE le rôle 'volunteer' à l'appelant lui-même
-- (aucune escalade de privilèges possible). Sans effet si un rôle existe déjà.

CREATE OR REPLACE FUNCTION kermesse_ensure_volunteer_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_existing_role
  FROM kermesse_user_roles
  WHERE user_id = auth.uid();

  IF v_existing_role IS NOT NULL THEN
    RETURN v_existing_role;   -- Rôle déjà présent (admin ou volunteer)
  END IF;

  INSERT INTO kermesse_user_roles (user_id, role)
  VALUES (auth.uid(), 'volunteer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN 'volunteer';
END;
$$;

-- Vue utilitaire : nombre d'inscrits par créneau (utilisée par le dashboard admin)
CREATE OR REPLACE VIEW kermesse_slot_fill_rate AS
SELECT
  sl.id                   AS slot_id,
  sl.stand_id,
  sl.start_time,
  sl.end_time,
  sl.max_volunteers,
  COUNT(sg.id)            AS current_count,
  sl.max_volunteers - COUNT(sg.id) AS remaining,
  CASE WHEN COUNT(sg.id) >= sl.max_volunteers THEN TRUE ELSE FALSE END AS is_full
FROM kermesse_slots sl
LEFT JOIN kermesse_signups sg ON sg.slot_id = sl.id
GROUP BY sl.id;

-- La vue agrège des compteurs globaux (aucune donnée personnelle).
-- Propriétaire postgres (BYPASSRLS) → les compteurs reflètent toutes les
-- inscriptions, y compris pour un bénévole qui ne voit que les siennes via RLS.
GRANT SELECT ON kermesse_slot_fill_rate TO authenticated;

-- KERMESSE — RPC admin : détail complet des inscriptions (email + nom + stand + créneau).
-- Nécessaire car l'email vit dans auth.users (non exposé) et agpe_users_profile
-- est en RLS "select_own". SECURITY DEFINER, réservé aux admins.
-- Alimente à la fois le tableau de bord consolidé et l'export CSV.
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
    SELECT 1 FROM kermesse_user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
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
