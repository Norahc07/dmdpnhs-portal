-- Soft-delete / trash for students.
-- Deleted learners stay recoverable in Registrar → Trash.
-- Trashed LRNs do NOT count as active, so they can be re-enrolled.
-- Run once in the Supabase SQL Editor.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS students_deleted_at_idx
  ON public.students (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Allow the same LRN on multiple trashed rows, but only one active row.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'students'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%lrn%'
  LOOP
    EXECUTE format('ALTER TABLE public.students DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.students_lrn_key;
DROP INDEX IF EXISTS public.students_lrn_uidx;
DROP INDEX IF EXISTS public.students_lrn_unique;

CREATE UNIQUE INDEX IF NOT EXISTS students_lrn_active_uidx
  ON public.students (lrn)
  WHERE deleted_at IS NULL;

-- Move any already-marked deleted rows into Trash so their LRNs are free.
UPDATE public.students
SET deleted_at = COALESCE(deleted_at, now()),
    status = 'deleted'
WHERE deleted_at IS NULL
  AND (
    status = 'deleted'
    OR profile_id IN (
      SELECT id FROM public.profiles WHERE status = 'trashed'
    )
  );
