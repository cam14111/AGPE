-- KERMESSE — Règle métier appliquée en base : désinscription impossible une
-- fois le créneau terminé.
--
-- Jusqu'ici la règle n'existait que côté interface (bouton masqué) : le DELETE
-- restait accepté par la RLS et un utilisateur pouvait se désinscrire après
-- coup via l'API, faussant l'historique de présence.
--
-- Règle : un bénévole ne peut plus supprimer son inscription lorsque la fin du
-- créneau (date + heure de fin, heure de Paris) est passée. Cela couvre aussi
-- le cas « événement terminé ». Restent autorisés :
--   • les administrateurs (correction de données à tout moment) ;
--   • les opérations sans JWT (service_role / SQL de maintenance) ;
--   • les suppressions en cascade (créneau/stand/événement supprimé par un
--     admin : le créneau parent n'existe déjà plus quand le trigger s'exécute).
--
-- Les heures des créneaux sont saisies et affichées en heure locale française :
-- la comparaison utilise donc le fuseau Europe/Paris (été/hiver automatique).

CREATE OR REPLACE FUNCTION kermesse_block_late_unsignup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_end TIMESTAMP;   -- fin du créneau, en heure locale Paris (naïve)
BEGIN
  -- Maintenance sans utilisateur authentifié : autorisé.
  IF auth.uid() IS NULL THEN
    RETURN OLD;
  END IF;

  -- Les admins peuvent corriger les inscriptions à tout moment.
  IF EXISTS (SELECT 1 FROM kermesse_user_roles
             WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN OLD;
  END IF;

  -- Fin du créneau : date du créneau (sinon date de fin de l'événement,
  -- pour les anciens créneaux sans date) + heure de fin.
  SELECT COALESCE(sl.date, ev.end_date) + sl.end_time
    INTO v_slot_end
  FROM kermesse_slots sl
  JOIN kermesse_stands st ON st.id = sl.stand_id
  JOIN kermesse_events ev ON ev.id = st.event_id
  WHERE sl.id = OLD.slot_id;

  -- Créneau introuvable : suppression en cascade en cours → autorisé.
  IF v_slot_end IS NULL THEN
    RETURN OLD;
  END IF;

  IF v_slot_end <= (NOW() AT TIME ZONE 'Europe/Paris') THEN
    RAISE EXCEPTION 'Créneau passé : la désinscription n''est plus possible une fois le créneau terminé.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS kermesse_block_late_unsignup ON kermesse_signups;
CREATE TRIGGER kermesse_block_late_unsignup
  BEFORE DELETE ON kermesse_signups
  FOR EACH ROW EXECUTE FUNCTION kermesse_block_late_unsignup();

-- Fonction de trigger uniquement : non appelable via l'API PostgREST.
REVOKE EXECUTE ON FUNCTION kermesse_block_late_unsignup() FROM PUBLIC, anon, authenticated;
