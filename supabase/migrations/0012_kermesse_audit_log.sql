-- KERMESSE — Historique des actions d'inscription (audit), réservé aux admins.
--
-- Journalise : inscription (signup), remplacement (replacement), désinscription
-- (unsignup) et autoréservation sur désistement (auto_reserved).
-- Inclut un instantané (prénom/nom du bénévole, stand, créneau) pour que
-- l'historique reste lisible même après modification/suppression des données.
--
-- ⚠️ Corrige aussi 0011 : la promotion automatique passe en SECURITY DEFINER
-- (sinon l'UPDATE du trigger est bloqué par la RLS en production).

CREATE TABLE IF NOT EXISTS kermesse_signup_audit (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID        NOT NULL,           -- portée (pas de FK : l'historique survit à la suppression)
  action             TEXT        NOT NULL CHECK (action IN ('signup','replacement','unsignup','auto_reserved')),
  volunteer_user_id  UUID,
  first_name         TEXT,
  last_name          TEXT,
  stand_name         TEXT,
  slot_start         TIME,
  slot_end           TIME,
  actor_kind         TEXT        NOT NULL CHECK (actor_kind IN ('self','admin','system')),
  actor_name         TEXT,                            -- nom de l'admin quand actor_kind = 'admin'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kermesse_signup_audit_event_idx
  ON kermesse_signup_audit (event_id, created_at DESC);

-- RLS : lecture et purge réservées aux admins ; aucune écriture directe via l'API
-- (les insertions se font exclusivement par les triggers SECURITY DEFINER).
ALTER TABLE kermesse_signup_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kermesse_audit_select_admin ON kermesse_signup_audit;
CREATE POLICY kermesse_audit_select_admin
  ON kermesse_signup_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS kermesse_audit_delete_admin ON kermesse_signup_audit;
CREATE POLICY kermesse_audit_delete_admin
  ON kermesse_signup_audit FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Nom affichable d'une personne : « Prénom Nom », sinon email, sinon « Inconnu ».
CREATE OR REPLACE FUNCTION kermesse_person_name(p_user UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(BTRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
    u.email::TEXT,
    'Inconnu'
  )
  FROM auth.users u
  LEFT JOIN agpe_users_profile p ON p.user_id = u.id
  WHERE u.id = p_user;
$$;

-- Écrit une entrée d'historique (instantané). Interne — non exposée à l'API.
CREATE OR REPLACE FUNCTION kermesse_log_audit(
  p_action TEXT, p_user_id UUID, p_slot_id UUID, p_actor_kind TEXT, p_actor UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event UUID; v_stand TEXT; v_start TIME; v_end TIME;
  v_fn TEXT; v_ln TEXT; v_actor_name TEXT;
BEGIN
  SELECT st.event_id, st.name, sl.start_time, sl.end_time
    INTO v_event, v_stand, v_start, v_end
  FROM kermesse_slots sl
  JOIN kermesse_stands st ON st.id = sl.stand_id
  WHERE sl.id = p_slot_id;

  IF v_event IS NULL THEN
    RETURN; -- créneau introuvable : pas de journalisation
  END IF;

  SELECT first_name, last_name INTO v_fn, v_ln
  FROM agpe_users_profile WHERE user_id = p_user_id;

  IF p_actor_kind = 'admin' AND p_actor IS NOT NULL THEN
    v_actor_name := kermesse_person_name(p_actor);
  END IF;

  INSERT INTO kermesse_signup_audit(
    event_id, action, volunteer_user_id, first_name, last_name,
    stand_name, slot_start, slot_end, actor_kind, actor_name
  ) VALUES (
    v_event, p_action, p_user_id, v_fn, v_ln,
    v_stand, v_start, v_end, p_actor_kind, v_actor_name
  );
END;
$$;

-- AFTER INSERT : journalise inscription / remplacement (toujours par l'intéressé).
CREATE OR REPLACE FUNCTION kermesse_audit_signup_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM kermesse_log_audit(
    CASE WHEN NEW.status = 'reserved' THEN 'signup' ELSE 'replacement' END,
    NEW.user_id, NEW.slot_id, 'self', NEW.user_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kermesse_audit_after_insert ON kermesse_signups;
CREATE TRIGGER kermesse_audit_after_insert
  AFTER INSERT ON kermesse_signups
  FOR EACH ROW EXECUTE FUNCTION kermesse_audit_signup_insert();

-- AFTER DELETE : journalise la désinscription, promeut le plus ancien remplaçant
-- (SECURITY DEFINER pour contourner la RLS) et journalise l'autoréservation.
CREATE OR REPLACE FUNCTION kermesse_promote_replacement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_kind   TEXT;
  v_promoted_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    v_actor_kind := 'system';
  ELSIF auth.uid() = OLD.user_id THEN
    v_actor_kind := 'self';
  ELSIF EXISTS (SELECT 1 FROM kermesse_user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    v_actor_kind := 'admin';
  ELSE
    v_actor_kind := 'self';
  END IF;

  PERFORM kermesse_log_audit('unsignup', OLD.user_id, OLD.slot_id, v_actor_kind, auth.uid());

  IF OLD.status = 'reserved' THEN
    UPDATE kermesse_signups
    SET status = 'reserved'
    WHERE id = (
      SELECT id FROM kermesse_signups
      WHERE slot_id = OLD.slot_id AND status = 'replacement'
      ORDER BY created_at ASC
      LIMIT 1
    )
    RETURNING user_id INTO v_promoted_user;

    IF v_promoted_user IS NOT NULL THEN
      PERFORM kermesse_log_audit('auto_reserved', v_promoted_user, OLD.slot_id, 'system', NULL);
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Verrouillage : fonctions internes non appelables via l'API (intégrité de l'audit).
REVOKE EXECUTE ON FUNCTION kermesse_person_name(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION kermesse_log_audit(TEXT, UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION kermesse_audit_signup_insert() FROM PUBLIC, anon, authenticated;
