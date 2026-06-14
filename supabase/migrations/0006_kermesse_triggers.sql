-- KERMESSE — Trigger : contrainte capacité max par créneau
CREATE OR REPLACE FUNCTION kermesse_check_slot_capacity() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE v_current_count INT; v_max_volunteers INT; BEGIN SELECT max_volunteers INTO v_max_volunteers FROM kermesse_slots WHERE id = NEW.slot_id FOR UPDATE; SELECT COUNT(*) INTO v_current_count FROM kermesse_signups WHERE slot_id = NEW.slot_id; IF v_current_count >= v_max_volunteers THEN RAISE EXCEPTION 'Créneau complet : % bénévole(s) maximum pour ce créneau.', v_max_volunteers; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS kermesse_enforce_slot_capacity ON kermesse_signups;
CREATE TRIGGER kermesse_enforce_slot_capacity BEFORE INSERT ON kermesse_signups FOR EACH ROW EXECUTE FUNCTION kermesse_check_slot_capacity();
