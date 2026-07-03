-- KERMESSE — RPC admin : suppression définitive d'un membre bénévole.
--
-- Réservée aux administrateurs. Garde-fous :
--   • impossible de supprimer son propre compte ;
--   • impossible de supprimer un administrateur (le rétrograder d'abord via
--     kermesse_admin_set_role, qui garantit déjà « au moins un admin »).
--
-- La suppression du compte auth.users cascade sur le profil
-- (agpe_users_profile), le rôle (kermesse_user_roles), les identités OAuth
-- (auth.identities) et les inscriptions (kermesse_signups). Les triggers
-- existants font le reste : promotion automatique des remplaçants sur les
-- créneaux libérés et journalisation des désinscriptions (acteur = admin).
-- L'historique d'audit conserve le nom du bénévole (instantané, sans FK).
--
-- Si le parent se reconnecte plus tard avec Google, un nouveau compte vierge
-- est créé : la suppression n'est pas un bannissement.

CREATE OR REPLACE FUNCTION kermesse_admin_delete_member(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_role TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kermesse_user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Impossible : vous ne pouvez pas supprimer votre propre compte.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable.';
  END IF;

  SELECT role INTO v_target_role
  FROM kermesse_user_roles WHERE user_id = p_user_id;

  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Impossible : rétrogradez d''abord cet administrateur en bénévole.';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION kermesse_admin_delete_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kermesse_admin_delete_member(UUID) TO authenticated;
