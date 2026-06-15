-- KERMESSE — Ajout d'une colonne `date` sur les stands et les créneaux.
--
-- Les stands appartiennent à une journée précise d'un événement.
-- Les créneaux héritent de la date du stand (préremplissage côté appli).
-- Les colonnes sont nullable en base pour ne pas bloquer les lignes existantes ;
-- la contrainte est appliquée au niveau applicatif.

ALTER TABLE kermesse_stands
  ADD COLUMN IF NOT EXISTS date DATE;

-- Backfill : on prend la start_date de l'événement parent.
UPDATE kermesse_stands s
  SET date = e.start_date
  FROM kermesse_events e
  WHERE s.event_id = e.id
    AND s.date IS NULL;

ALTER TABLE kermesse_slots
  ADD COLUMN IF NOT EXISTS date DATE;

-- Backfill : on prend la date du stand parent.
UPDATE kermesse_slots sl
  SET date = st.date
  FROM kermesse_stands st
  WHERE sl.stand_id = st.id
    AND sl.date IS NULL;

-- Index pour les requêtes de chevauchement par date.
CREATE INDEX IF NOT EXISTS kermesse_slots_date_idx ON kermesse_slots (stand_id, date);
