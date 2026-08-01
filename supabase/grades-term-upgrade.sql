-- =============================================================================
-- Grades: 3 terms (1st / 2nd / Final) + school year history
-- Safe to re-run. Keeps prior quarterly rows and remaps them into term codes.
-- =============================================================================

SET search_path = public, extensions;

-- School year so past terms remain visible until graduation
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS school_year text;

-- Backfill school year from the learner's current section when missing
UPDATE public.grades g
SET school_year = COALESCE(
  (
    SELECT s.school_year
    FROM public.students st
    JOIN public.sections s ON s.id = st.section_id
    WHERE st.id = g.student_id
  ),
  to_char(COALESCE(g.created_at, now()), 'YYYY') || '-' ||
    to_char(COALESCE(g.created_at, now()) + interval '1 year', 'YYYY')
)
WHERE g.school_year IS NULL OR btrim(g.school_year) = '';

ALTER TABLE public.grades
  ALTER COLUMN school_year SET DEFAULT '2025-2026';

ALTER TABLE public.grades
  ALTER COLUMN school_year SET NOT NULL;

-- Allow term codes 1–3 (was quarterly 1–4). Map old Q4 → Final (3).
UPDATE public.grades SET quarter = 3 WHERE quarter = 4;
UPDATE public.grades SET quarter = 3 WHERE quarter > 3;

ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_quarter_check;
ALTER TABLE public.grades
  ADD CONSTRAINT grades_quarter_check CHECK (quarter BETWEEN 1 AND 3);

-- Unique per learner + subject + school year + term (history preserved)
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_student_id_subject_id_quarter_key;
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_student_subject_year_term_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'grades_student_subject_year_term_key'
      AND conrelid = 'public.grades'::regclass
  ) THEN
    ALTER TABLE public.grades
      ADD CONSTRAINT grades_student_subject_year_term_key
      UNIQUE (student_id, subject_id, school_year, quarter);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS grades_student_year_term_idx
  ON public.grades (student_id, school_year, quarter);

COMMENT ON COLUMN public.grades.quarter IS
  'Term code: 1 = 1st Term, 2 = 2nd Term, 3 = Final Term';
COMMENT ON COLUMN public.grades.school_year IS
  'School year label (e.g. 2026-2027). Grades are retained across years.';
