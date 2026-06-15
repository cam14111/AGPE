-- KERMESSE — Correctif : statut « remplaçant » erroné pour les bénévoles.
--
-- Le trigger kermesse_check_slot_capacity lit le créneau avec FOR UPDATE.
-- Sur une table dont seuls les admins ont une policy d'écriture (ALL), le
-- verrouillage FOR UPDATE applique la policy UPDATE : pour un bénévole, la ligne
-- est filtrée → v_max devient NULL → « v_reserved < NULL » est NULL → branche
-- ELSE → statut 'replacement', même sur un créneau libre.
--
-- Correctif : exécuter la fonction en SECURITY DEFINER pour contourner la RLS
-- (lecture fiable de la capacité quel que soit le rôle de l'appelant).

CREATE OR REPLACE FUNCTION public.kermesse_check_slot_capacity()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_start    TIME;
  v_end      TIME;
  v_date     DATE;
  v_max      INT;
  v_event    UUID;
  v_reserved INT;
BEGIN
  SELECT sl.start_time, sl.end_time, sl.date, sl.max_volunteers, st.event_id
    INTO v_start, v_end, v_date, v_max, v_event
  FROM kermesse_slots sl
  JOIN kermesse_stands st ON st.id = sl.stand_id
  WHERE sl.id = NEW.slot_id
  FOR UPDATE OF sl;

  IF EXISTS (
    SELECT 1
    FROM kermesse_signups sg
    JOIN kermesse_slots  sl ON sl.id = sg.slot_id
    JOIN kermesse_stands st ON st.id = sl.stand_id
    WHERE sg.user_id   = NEW.user_id
      AND sg.slot_id  <> NEW.slot_id
      AND st.event_id  = v_event
      AND sl.date      = v_date
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
$function$;
