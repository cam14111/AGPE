-- KERMESSE — Mise à jour du trigger de chevauchement pour prendre en compte la date.
--
-- Depuis la migration 0016, les créneaux ont une colonne `date`.
-- Le trigger doit maintenant aussi comparer les dates pour éviter de bloquer
-- un bénévole qui s'inscrit sur des créneaux à des jours différents.

CREATE OR REPLACE FUNCTION kermesse_check_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_start    TIME;
  v_end      TIME;
  v_date     DATE;
  v_max      INT;
  v_event    UUID;
  v_reserved INT;
BEGIN
  -- Verrouille le créneau ciblé et récupère ses bornes, date et événement.
  SELECT sl.start_time, sl.end_time, sl.date, sl.max_volunteers, st.event_id
    INTO v_start, v_end, v_date, v_max, v_event
  FROM kermesse_slots sl
  JOIN kermesse_stands st ON st.id = sl.stand_id
  WHERE sl.id = NEW.slot_id
  FOR UPDATE OF sl;

  -- Interdit tout chevauchement horaire avec un autre créneau de l'utilisateur
  -- sur le même événement ET le même jour.
  -- Deux intervalles se chevauchent si a.start < b.end ET a.end > b.start.
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

  -- Détermine le statut selon les places réservées restantes.
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
