-- =============================================================================
-- DMDPNHS Portal — Grade 12 HUMSS sections (SY 2025-2026)
-- HUMSS-A through HUMSS-H
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS male_count integer,
  ADD COLUMN IF NOT EXISTS female_count integer,
  ADD COLUMN IF NOT EXISTS adviser_name text,
  ADD COLUMN IF NOT EXISTS track_strand text;

DO $$
DECLARE
  sec_a uuid := 'c1200000-0000-4000-8000-000000000001';
  sec_b uuid := 'c1200000-0000-4000-8000-000000000002';
  sec_c uuid := 'c1200000-0000-4000-8000-000000000003';
  sec_d uuid := 'c1200000-0000-4000-8000-000000000004';
  sec_e uuid := 'c1200000-0000-4000-8000-000000000005';
  sec_f uuid := 'c1200000-0000-4000-8000-000000000006';
  sec_g uuid := 'c1200000-0000-4000-8000-000000000007';
  sec_h uuid := 'c1200000-0000-4000-8000-000000000008';

  humss_ids uuid[] := ARRAY[
    sec_a, sec_b, sec_c, sec_d, sec_e, sec_f, sec_g, sec_h
  ];
  humss_names text[] := ARRAY[
    'HUMSS-A','HUMSS-B','HUMSS-C','HUMSS-D',
    'HUMSS-E','HUMSS-F','HUMSS-G','HUMSS-H'
  ];
BEGIN
  UPDATE public.students
  SET section_id = NULL
  WHERE section_id = ANY (humss_ids)
     OR section_id IN (
          SELECT id FROM public.sections
          WHERE grade_level = 12
            AND school_year = '2025-2026'
            AND section_name = ANY (humss_names)
        );

  DELETE FROM public.sections
  WHERE id = ANY (humss_ids)
     OR (
          grade_level = 12
          AND school_year = '2025-2026'
          AND section_name = ANY (humss_names)
        );

  INSERT INTO public.sections (
    id, section_name, grade_level, school_year,
    track_strand, capacity, male_count, female_count
  )
  VALUES
    (sec_a, 'HUMSS-A', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_b, 'HUMSS-B', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_c, 'HUMSS-C', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_d, 'HUMSS-D', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_e, 'HUMSS-E', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_f, 'HUMSS-F', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_g, 'HUMSS-G', 12, '2025-2026', 'HUMSS', 45, 0, 0),
    (sec_h, 'HUMSS-H', 12, '2025-2026', 'HUMSS', 45, 0, 0);
END $$;
