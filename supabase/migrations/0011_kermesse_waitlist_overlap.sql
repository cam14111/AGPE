-- KERMESSE — Liste d'attente (remplaçants) + interdiction de chevauchement horaire.
--
-- Modèle : chaque inscription a un statut 'reserved' (place ferme) ou
-- 'replacement' (remplaçant en file d'attente).
--  • À l'inscription : si des places réservées restent → 'reserved', sinon 'replacement'.
--  • Interdiction : un même utilisateur ne peut pas s'inscrire sur deux créneaux
--    dont les horaires se chevauchent (toutes statuts confondus, même événement).
--  • À la désinscription d'un 'reserved' : le plus ancien 'replacement' du créneau
--    passe automatiquement 'reserved'.

-- 1) Colonne statut (idempotent).
ALTER TABLE kermesse_signups
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reserved'
  CHECK (status IN ('reserved', 'replacement'));

CREATE INDEX IF NOT EXISTS kermesse_signups_slot_status_idx
  ON kermesse_signups (slot_id, status, created_at);

-- 2) BEFORE INSERT : chevauchement + détermination du statut (réservé/remplaçant).
CREATE OR REPLACE FUNCTION kermesse_check_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_start    TIME;
  v_end      TIME;
  v_max      INT;
  v_event    UUID;
  v_reserved INT;
BEGIN
  -- Verrouille le créneau ciblé et récupère ses bornes + événement.
  SELECT sl.start_time, sl.end_time, sl.max_volunteers, st.event_id
    INTO v_start, v_end, v_max, v_event
  FROM kermesse_slots sl
  JOIN kermesse_stands st ON st.id = sl.stand_id
  WHERE sl.id = NEW.slot_id
  FOR UPDATE OF sl;

  -- Interdit tout chevauchement horaire avec un autre créneau de l'utilisateur
  -- (même événement). Deux intervalles se chevauchent si a.start < b.end ET a.end > b.start.
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

  -- Détermine le statut selon les places réservées restantes (plus de blocage si complet).
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

-- 3) AFTER DELETE : promotion automatique du plus ancien remplaçant.
CREATE OR REPLACE FUNCTION kermesse_promote_replacement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'reserved' THEN
    UPDATE kermesse_signups
    SET status = 'reserved'
    WHERE id = (
      SELECT id FROM kermesse_signups
      WHERE slot_id = OLD.slot_id AND status = 'replacement'
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS kermesse_promote_after_unsignup ON kermesse_signups;
CREATE TRIGGER kermesse_promote_after_unsignup
  AFTER DELETE ON kermesse_signups
  FOR EACH ROW EXECUTE FUNCTION kermesse_promote_replacement();

-- 4) Vue (fonction) de remplissage : compteurs réservés + remplaçants.
DROP FUNCTION IF EXISTS kermesse_slot_fill_rate();
CREATE FUNCTION kermesse_slot_fill_rate()
RETURNS TABLE (
  slot_id           UUID,
  stand_id          UUID,
  start_time        TIME,
  end_time          TIME,
  max_volunteers    INT,
  current_count     BIGINT,
  remaining         BIGINT,
  is_full           BOOLEAN,
  replacement_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sl.id,
    sl.stand_id,
    sl.start_time,
    sl.end_time,
    sl.max_volunteers,
    COUNT(sg.id) FILTER (WHERE sg.status = 'reserved')                       AS current_count,
    GREATEST(sl.max_volunteers - COUNT(sg.id) FILTER (WHERE sg.status = 'reserved'), 0) AS remaining,
    COUNT(sg.id) FILTER (WHERE sg.status = 'reserved') >= sl.max_volunteers  AS is_full,
    COUNT(sg.id) FILTER (WHERE sg.status = 'replacement')                    AS replacement_count
  FROM kermesse_slots sl
  LEFT JOIN kermesse_signups sg ON sg.slot_id = sl.id
  GROUP BY sl.id;
$$;

REVOKE EXECUTE ON FUNCTION kermesse_slot_fill_rate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kermesse_slot_fill_rate() TO authenticated;

-- 5) Détail admin : ajoute le statut (réservés d'abord, puis ordre d'arrivée).
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
    sl.start_time,
    sl.end_time,
    sg.status
  FROM kermesse_signups sg
  JOIN kermesse_slots  sl ON sl.id = sg.slot_id
  JOIN kermesse_stands st ON st.id = sl.stand_id
  LEFT JOIN auth.users au ON au.id = sg.user_id
  LEFT JOIN agpe_users_profile pr ON pr.user_id = sg.user_id
  WHERE st.event_id = p_event_id
  ORDER BY st.name, sl.start_time, (sg.status = 'reserved') DESC, sg.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION kermesse_admin_signup_details(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kermesse_admin_signup_details(UUID) TO authenticated;
