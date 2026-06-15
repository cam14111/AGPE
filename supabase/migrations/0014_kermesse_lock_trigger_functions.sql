-- KERMESSE — Verrouille les fonctions de trigger SECURITY DEFINER : elles ne
-- doivent pas être appelables via l'API PostgREST (elles ne le sont d'ailleurs
-- que dans un contexte trigger). On retire l'accès EXECUTE des rôles exposés.

REVOKE EXECUTE ON FUNCTION kermesse_check_slot_capacity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION kermesse_promote_replacement() FROM PUBLIC, anon, authenticated;
