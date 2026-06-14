-- KERMESSE — Gestion des rôles (admin) : lister les membres, promouvoir / rétrograder.
-- Toutes les fonctions sont SECURITY DEFINER et réservées aux administrateurs.
-- Garantie : il doit toujours rester au moins un administrateur.

-- Liste des membres (utilisateurs ayant déjà ouvert une session) avec leur rôle.
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
    SELECT 1 FROM kermesse_user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
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

-- Définit le rôle d'un utilisateur (admin | volunteer).
-- Refuse de retirer le dernier administrateur.
CREATE OR REPLACE FUNCTION kermesse_admin_set_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kermesse_user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs.';
  END IF;

  IF p_role NOT IN ('admin', 'volunteer') THEN
    RAISE EXCEPTION 'Rôle invalide : %', p_role;
  END IF;

  -- L'utilisateur cible doit exister.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable.';
  END IF;

  -- Garde : ne jamais rétrograder le dernier administrateur.
  IF p_role = 'volunteer' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM kermesse_user_roles WHERE role = 'admin';

    IF v_admin_count <= 1
       AND EXISTS (
         SELECT 1 FROM kermesse_user_roles
         WHERE user_id = p_user_id AND role = 'admin'
       ) THEN
      RAISE EXCEPTION 'Impossible : il doit rester au moins un administrateur.';
    END IF;
  END IF;

  INSERT INTO kermesse_user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

REVOKE EXECUTE ON FUNCTION kermesse_admin_list_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kermesse_admin_list_members() TO authenticated;

REVOKE EXECUTE ON FUNCTION kermesse_admin_set_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kermesse_admin_set_role(UUID, TEXT) TO authenticated;
