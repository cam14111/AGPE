-- KERMESSE — Correctif RLS : le trigger de capacité doit compter TOUTES les
-- inscriptions du créneau. En SECURITY INVOKER, la RLS de kermesse_signups
-- (lecture limitée à ses propres lignes) faussait le compteur de places réservées
-- (capacité jamais atteinte, statut 'replacement' jamais attribué en production).
-- Passage en SECURITY DEFINER. Le contrôle de chevauchement reste correct
-- (il ne porte que sur les créneaux de l'utilisateur courant).

CREATE OR REPLACE FUNCTION kermesse_check_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start    TIME;
  v_end      TIME;
  v_max      INT;
  v_event    UUID;
  v_reserved INT;
BEGIN
  SELECT sl.start_time, sl.end_time, sl.max_volunteers, st.event_id
    INTO v_start, v_end, v_max, v_event
  FROM kermesse_slots sl
  JOIN kermesse_stands st ON st.id = sl.stand_id
  WHERE sl.id = NEW.slot_id
  FOR UPDATE OF sl;

  IF EXISTS (
    SELECT 1
    FROM kermesse_signups sg
    JOIN kermesse_slots  sl ON sl.id = sg.slot_id
    JOIN kermesse_stands st ON st.id = sl.stand_id
    WHERE sg.user_id = NEW.user_id
      AND sg.slot_id <> NEW.slot_id
      AND st.event_id = v_event
      AND sl.start_time < v_end
      AND sl.end_time   > v_start
  ) THEN
    RAISE EXCEPTION 'Chevauchement : vous êtes déjà inscrit sur un créneau qui se chevauche avec celui-ci.';
  END IF;

  SELECT COUNT(*) INTO v_reserved
  FROM kermesse_signups
  WHERE slot_id = NEW.slot_id AND status = 'reserved';

  IF v_reserved < v_max THEN
    NEW.status := 'reserved';
  ELSE
    NEW.status := 'replacement';
  END IF;

  RETURN NEW;
END;
$$;
