-- =============================================================================
-- SHS term subjects + registrar subject enrollment foundation
-- Run once in Supabase SQL Editor after grades-term-upgrade.sql
-- =============================================================================

SET search_path = public, extensions;

-- Subject catalog: which term a subject is offered + major vs minor
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS academic_term smallint,
  ADD COLUMN IF NOT EXISTS subject_kind text NOT NULL DEFAULT 'major';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subjects_academic_term_check'
  ) THEN
    ALTER TABLE public.subjects
      ADD CONSTRAINT subjects_academic_term_check
      CHECK (academic_term IS NULL OR academic_term IN (1, 2, 3));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subjects_subject_kind_check'
  ) THEN
    ALTER TABLE public.subjects
      ADD CONSTRAINT subjects_subject_kind_check
      CHECK (subject_kind IN ('major', 'minor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS subjects_shs_term_idx
  ON public.subjects (grade_level, track_strand, academic_term);

-- Student: which SHS term they are in now (registrar-set)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS current_term smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_current_term_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_current_term_check
      CHECK (current_term IS NULL OR current_term IN (1, 2, 3));
  END IF;
END $$;

-- Per-student subject registration for a school year + term
CREATE TABLE IF NOT EXISTS public.student_subject_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  school_year text NOT NULL,
  term smallint NOT NULL CHECK (term IN (1, 2, 3)),
  status text NOT NULL DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'dropped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, school_year, term)
);

CREATE INDEX IF NOT EXISTS student_subject_enrollments_student_idx
  ON public.student_subject_enrollments (student_id, school_year, term);

CREATE INDEX IF NOT EXISTS student_subject_enrollments_section_subject_idx
  ON public.student_subject_enrollments (section_id, subject_id, school_year, term)
  WHERE status = 'enrolled';

ALTER TABLE public.student_subject_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_subject_enrollments'
      AND policyname = 'student_subject_enrollments_select_authenticated'
  ) THEN
    CREATE POLICY student_subject_enrollments_select_authenticated
      ON public.student_subject_enrollments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Backfill Grade 12 HUMSS academic_term + subject_kind from known curriculum
UPDATE public.subjects s
SET
  academic_term = v.term,
  subject_kind = v.kind,
  track_strand = COALESCE(s.track_strand, 'HUMSS')
FROM (
  VALUES
    -- Term 1
    ('Media and Information Literacy', 1, 'minor'),
    ('Earth and Life Science', 1, 'minor'),
    ('Physical Education and Health III', 1, 'minor'),
    ('Practical Research II', 1, 'major'),
    ('Creative Non-Fiction', 1, 'major'),
    ('Trends, Networks, and Critical Thinking in the 21st Century Culture', 1, 'major'),
    -- Term 2
    ('Pagbasa at Pagsusuri ng Iba''t-Ibang Teksto Tungo sa Pananaliksik', 2, 'minor'),
    ('Inquiries, Investigations, and Immersions (3Is)', 2, 'major'),
    ('Introduction to World Religions and Belief Systems', 2, 'major'),
    ('Community Engagement, Solidarity and Citizenship', 2, 'major'),
    ('Work Immersion/Research/Culminating Activity', 2, 'major'),
    -- Term 3
    ('Physical Science', 3, 'minor'),
    ('Contemporary Philippine Arts from the Regions', 3, 'minor'),
    ('Introduction to the Philosophy of the Human Person', 3, 'minor'),
    ('Physical Education and Health IV', 3, 'minor'),
    ('Entrepreneurship', 3, 'minor')
) AS v(subject_name, term, kind)
WHERE s.grade_level = 12
  AND lower(s.subject_name) = lower(v.subject_name)
  AND (
    s.track_strand IS NULL
    OR upper(s.track_strand) LIKE '%HUMSS%'
  );
