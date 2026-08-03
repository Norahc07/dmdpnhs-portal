-- =============================================================================
-- Class records: one workbook per assignment + term (1st / 2nd / Final Semestral)
-- Safe to re-run.
-- =============================================================================

SET search_path = public, extensions;

-- Backfill / add term column (1 = 1st Semestral, 2 = 2nd Semestral, 3 = Final)
ALTER TABLE public.class_records
  ADD COLUMN IF NOT EXISTS term smallint;

UPDATE public.class_records
SET term = 1
WHERE term IS NULL;

ALTER TABLE public.class_records
  ALTER COLUMN term SET DEFAULT 1,
  ALTER COLUMN term SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_records_term_check'
  ) THEN
    ALTER TABLE public.class_records
      ADD CONSTRAINT class_records_term_check
      CHECK (term IN (1, 2, 3));
  END IF;
END $$;

-- Replace UNIQUE(assignment_id) with UNIQUE(assignment_id, term)
ALTER TABLE public.class_records
  DROP CONSTRAINT IF EXISTS class_records_assignment_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_records_assignment_term_key'
  ) THEN
    ALTER TABLE public.class_records
      ADD CONSTRAINT class_records_assignment_term_key
      UNIQUE (assignment_id, term);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS class_records_assignment_term_idx
  ON public.class_records (assignment_id, term);
