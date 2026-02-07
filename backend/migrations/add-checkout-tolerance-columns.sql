-- =====================================================
-- MIGRATION: Tolérances Check-out
-- Date: 2026-02-07
-- Description: Ajout de colonnes pour gérer les tolérances
--              de départ anticipé et tardif pour le check-out
-- =====================================================

-- 1. Ajouter les colonnes de tolérance check-out dans la table events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS earlyCheckoutTolerance INT DEFAULT 30 
  COMMENT 'Tolérance départ anticipé avant fin événement (minutes)',
ADD COLUMN IF NOT EXISTS lateCheckoutTolerance INT DEFAULT 15 
  COMMENT 'Tolérance départ tardif après fin événement (minutes)';

-- 2. Ajouter colonnes tracking départ anticipé/tardif dans la table attendances
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS earlyDepartureMinutes INT 
  COMMENT 'Nombre de minutes de départ anticipé (si check-out avant fin)',
ADD COLUMN IF NOT EXISTS overtimeMinutes INT 
  COMMENT 'Nombre de minutes de prolongation après fin (si check-out après fin)';

-- 3. Mettre à jour les événements existants avec les valeurs par défaut
UPDATE events 
SET earlyCheckoutTolerance = 30, 
    lateCheckoutTolerance = 15
WHERE earlyCheckoutTolerance IS NULL 
   OR lateCheckoutTolerance IS NULL;

-- 4. Créer un index pour optimiser les requêtes sur les tolérances
CREATE INDEX IF NOT EXISTS idx_events_checkout_tolerance 
ON events(earlyCheckoutTolerance, lateCheckoutTolerance);

-- 5. Vérification des colonnes ajoutées
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'events' 
  AND COLUMN_NAME IN ('earlyCheckoutTolerance', 'lateCheckoutTolerance');

-- 6. Vérification du nombre d'événements mis à jour
SELECT 
  COUNT(*) as total_events,
  AVG(earlyCheckoutTolerance) as avg_early_tolerance,
  AVG(lateCheckoutTolerance) as avg_late_tolerance
FROM events;

-- =====================================================
-- ROLLBACK (en cas de problème)
-- =====================================================
-- ALTER TABLE events DROP COLUMN IF EXISTS earlyCheckoutTolerance;
-- ALTER TABLE events DROP COLUMN IF EXISTS lateCheckoutTolerance;
-- ALTER TABLE attendances DROP COLUMN IF EXISTS earlyDepartureMinutes;
-- ALTER TABLE attendances DROP COLUMN IF EXISTS overtimeMinutes;
-- DROP INDEX IF EXISTS idx_events_checkout_tolerance ON events;
