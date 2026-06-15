-- KERMESSE — Événements multi-jours : ajout de start_date et end_date.
--
-- La colonne `date` est conservée pour compatibilité avec les vues bénévoles
-- (useMySignups, StandsList) qui la référencent encore. Elle sera supprimée
-- dans une migration ultérieure une fois toutes les vues mises à jour.

ALTER TABLE kermesse_events
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

-- Backfill : on reprend la valeur de `date` pour les lignes existantes.
UPDATE kermesse_events
  SET start_date = date, end_date = date
  WHERE start_date IS NULL;

ALTER TABLE kermesse_events ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE kermesse_events ALTER COLUMN end_date   SET NOT NULL;

ALTER TABLE kermesse_events
  ADD CONSTRAINT kermesse_events_date_range_check
  CHECK (end_date >= start_date);
