-- =============================================================================
-- DMDPNHS Portal — Grade 10 sections seed (SY 2025-2026)
-- 14 sections with JHS track specializations (ICT / Cookery / Drafting)
--
-- Run in Supabase SQL Editor.
-- Safe to re-run: removes prior rows for these fixed UUIDs / names, then reseeds.
--
-- Notes:
--   • Core columns: section_name, grade_level, school_year, adviser_id
--   • Extra school metadata columns are added if missing:
--       location, capacity, male_count, female_count, adviser_name, track_strand
--   • track_strand stores the section specialization
--     (ICT, Cookery, Drafting, Drafting (Special Eng))
--   • adviser_id is linked when a matching teacher profile already exists
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 1) Ensure sections can store school roster + track metadata
-- --------------------------------------------------------------------------
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS male_count integer,
  ADD COLUMN IF NOT EXISTS female_count integer,
  ADD COLUMN IF NOT EXISTS adviser_name text,
  ADD COLUMN IF NOT EXISTS track_strand text;

DO $$
DECLARE
  -- Stable UUIDs (ca = Grade 10 seed namespace)
  sec_einstein   uuid := 'ca000000-0000-4000-8000-000000000001';
  sec_becquerel  uuid := 'ca000000-0000-4000-8000-000000000002';
  sec_fermi      uuid := 'ca000000-0000-4000-8000-000000000003';
  sec_maxwell    uuid := 'ca000000-0000-4000-8000-000000000004';
  sec_edison     uuid := 'ca000000-0000-4000-8000-000000000005';
  sec_faraday    uuid := 'ca000000-0000-4000-8000-000000000006';
  sec_chadwick   uuid := 'ca000000-0000-4000-8000-000000000007';
  sec_galilei    uuid := 'ca000000-0000-4000-8000-000000000008';
  sec_hertz      uuid := 'ca000000-0000-4000-8000-000000000009';
  sec_curie      uuid := 'ca000000-0000-4000-8000-00000000000a';
  sec_newton     uuid := 'ca000000-0000-4000-8000-00000000000b';
  sec_nobel      uuid := 'ca000000-0000-4000-8000-00000000000c';
  sec_roentgen   uuid := 'ca000000-0000-4000-8000-00000000000d';
  sec_rutherford uuid := 'ca000000-0000-4000-8000-00000000000e';

  grade10_ids uuid[] := ARRAY[
    sec_einstein, sec_becquerel, sec_fermi, sec_maxwell, sec_edison,
    sec_faraday, sec_chadwick, sec_galilei, sec_hertz, sec_curie,
    sec_newton, sec_nobel, sec_roentgen, sec_rutherford
  ];

  grade10_names text[] := ARRAY[
    'SPSTEM EINSTEIN',
    'BECQUEREL',
    'FERMI',
    'MAXWELL',
    'EDISON',
    'FARADAY',
    'CHADWICK',
    'GALILEI',
    'HERTZ',
    'CURIE',
    'NEWTON',
    'NOBEL',
    'ROENTGEN',
    'RUTHERFORD',
    -- legacy
    'GRADE 10 SPSTEM EINSTEIN',
    'GRADE 10 BECQUEREL',
    'GRADE 10 FERMI',
    'GRADE 10 MAXWELL',
    'GRADE 10 EDISON',
    'GRADE 10 FARADAY',
    'GRADE 10 CHADWICK',
    'GRADE 10 GALILEI',
    'GRADE 10 HERTZ',
    'GRADE 10 CURIE',
    'GRADE 10 NEWTON',
    'GRADE 10 NOBEL',
    'GRADE 10 ROENTGEN',
    'GRADE 10 RUTHERFORD'
  ];
BEGIN
  -- --------------------------------------------------------------------------
  -- 2) Cleanup prior Grade 10 seed for this school year
  -- --------------------------------------------------------------------------
  UPDATE public.students
  SET section_id = NULL
  WHERE section_id = ANY (grade10_ids)
     OR section_id IN (
          SELECT id
          FROM public.sections
          WHERE grade_level = 10
            AND school_year = '2025-2026'
            AND section_name = ANY (grade10_names)
        );

  IF to_regclass('public.attendance') IS NOT NULL THEN
    DELETE FROM public.attendance
    WHERE section_id = ANY (grade10_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 10
              AND school_year = '2025-2026'
              AND section_name = ANY (grade10_names)
          );
  END IF;

  IF to_regclass('public.school_events') IS NOT NULL THEN
    DELETE FROM public.school_events
    WHERE section_id = ANY (grade10_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 10
              AND school_year = '2025-2026'
              AND section_name = ANY (grade10_names)
          );
  END IF;

  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    DELETE FROM public.teacher_assignments
    WHERE section_id = ANY (grade10_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 10
              AND school_year = '2025-2026'
              AND section_name = ANY (grade10_names)
          );
  END IF;

  IF to_regclass('public.class_schedules') IS NOT NULL THEN
    DELETE FROM public.class_schedules
    WHERE section_id = ANY (grade10_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 10
              AND school_year = '2025-2026'
              AND section_name = ANY (grade10_names)
          );
  END IF;

  DELETE FROM public.sections
  WHERE id = ANY (grade10_ids)
     OR (
          grade_level = 10
          AND school_year = '2025-2026'
          AND section_name = ANY (grade10_names)
        );

  -- --------------------------------------------------------------------------
  -- 3) Insert Grade 10 sections
  -- --------------------------------------------------------------------------
  INSERT INTO public.sections (
    id,
    section_name,
    grade_level,
    school_year,
    adviser_id,
    adviser_name,
    track_strand,
    location,
    capacity,
    male_count,
    female_count
  )
  SELECT
    v.id,
    v.section_name,
    10 AS grade_level,
    '2025-2026'::text AS school_year,
    t.id AS adviser_id,
    v.adviser_name,
    v.track_strand,
    v.location,
    v.capacity,
    v.male_count,
    v.female_count
  FROM (
    VALUES
      (sec_einstein,   'SPSTEM EINSTEIN', 'ICT',                   'Mr. John Rafael Laureles',      'FQL Bldg. 8, 2nd floor',              50, 11, 34, 'John Rafael', 'Laureles'),
      (sec_becquerel,  'BECQUEREL',       'Cookery',               'Mr. Leif Erickson Derecho',      'Chinese Chamber Bldg. 9',             40, 19, 18, 'Leif Erickson', 'Derecho'),
      (sec_fermi,      'FERMI',           'Drafting',              'Mr. Mark Roy Aum Torres',        'Chinese Chamber Bldg. 9',             40, 22, 15, 'Mark Roy Aum', 'Torres'),
      (sec_maxwell,    'MAXWELL',         'ICT',                   'Ms. Aezel Bantoc Abustan',       'DepEd Bldg. (Back-SHS) 7, 2nd floor', 45, 23, 20, 'Aezel Bantoc', 'Abustan'),
      (sec_edison,     'EDISON',          'Drafting',              'Ms. Mary Daryll Pasoquin',       'DepEd 1 Bldg. 10',                    40, 25, 11, 'Mary Daryll', 'Pasoquin'),
      (sec_faraday,    'FARADAY',         'Cookery',               'Ms. Claribelle Caparros',        'RPN Bldg. 3, 1st floor',              47, 19, 20, 'Claribelle', 'Caparros'),
      (sec_chadwick,   'CHADWICK',        'ICT',                   'Mr. Gio Dustin Alcala Talito',   'RPN Bldg. 3, 2nd floor',              47, 22, 22, 'Gio Dustin Alcala', 'Talito'),
      (sec_galilei,    'GALILEI',         'ICT',                   'Mr. Fritz Gerald Camacho',       'FQL Bldg. 8, 2nd floor',              50, 18, 26, 'Fritz Gerald', 'Camacho'),
      (sec_hertz,      'HERTZ',           'Cookery',               'Mr. John Kerby Calusin',         'Chinese Chamber Bldg. 9',             40, 13, 23, 'John Kerby', 'Calusin'),
      (sec_curie,      'CURIE',           'Cookery',               'Ms. Leslie May Coros',           'Chinese Chamber Bldg. 9',             40, 15, 25, 'Leslie May', 'Coros'),
      (sec_newton,     'NEWTON',          'Cookery',               'Mr. Machristian Ang',            'FQL Bldg. 8, 1st floor',              50, 21, 17, 'Machristian', 'Ang'),
      (sec_nobel,      'NOBEL',           'Drafting (Special Eng)', 'Ms. Denisse Alejos Gabo',       'DepEd 1 Bldg. 10',                    40, 19, 15, 'Denisse Alejos', 'Gabo'),
      (sec_roentgen,   'ROENTGEN',        'ICT',                   'Ms. Ariane Astoveza Balitian',   'DepEd Bldg. (Back-SHS) 7, 1st floor', 45, 16, 24, 'Ariane Astoveza', 'Balitian'),
      (sec_rutherford, 'RUTHERFORD',      'Drafting',              'Ms. Alexa Jazreel Bussa',        'RPB Bldg. 2',                         40, 19, 17, 'Alexa Jazreel', 'Bussa')
  ) AS v(
    id,
    section_name,
    track_strand,
    adviser_name,
    location,
    capacity,
    male_count,
    female_count,
    match_first,
    match_last
  )
  LEFT JOIN LATERAL (
    SELECT te.id
    FROM public.teachers te
    JOIN public.profiles p ON p.id = te.profile_id
    WHERE lower(btrim(p.last_name)) = lower(btrim(v.match_last))
      AND (
        lower(btrim(p.first_name)) = lower(btrim(v.match_first))
        OR lower(btrim(p.first_name))
             LIKE lower(btrim(split_part(v.match_first, ' ', 1))) || '%'
        OR lower(btrim(v.match_first))
             LIKE '%' || lower(btrim(p.first_name)) || '%'
      )
    ORDER BY
      CASE
        WHEN lower(btrim(p.first_name)) = lower(btrim(v.match_first)) THEN 0
        WHEN lower(btrim(p.first_name))
               LIKE lower(btrim(split_part(v.match_first, ' ', 1))) || '%' THEN 1
        ELSE 2
      END
    LIMIT 1
  ) t ON TRUE;

  RAISE NOTICE 'Seeded % Grade 10 sections for SY 2025-2026.',
    (SELECT count(*) FROM public.sections
      WHERE grade_level = 10
        AND school_year = '2025-2026'
        AND id = ANY (grade10_ids));
END $$;

-- --------------------------------------------------------------------------
-- 4) Quick verification
-- --------------------------------------------------------------------------
SELECT
  section_name,
  track_strand,
  grade_level,
  school_year,
  adviser_name,
  location,
  capacity,
  male_count AS male,
  female_count AS female,
  (male_count + female_count) AS enrolled_headcount,
  adviser_id IS NOT NULL AS adviser_linked
FROM public.sections
WHERE grade_level = 10
  AND school_year = '2025-2026'
  AND id::text LIKE 'ca000000-%'
ORDER BY track_strand, section_name;

-- Track summary
SELECT
  track_strand,
  count(*) AS sections,
  coalesce(sum(male_count), 0) AS male,
  coalesce(sum(female_count), 0) AS female,
  coalesce(sum(male_count + female_count), 0) AS enrolled
FROM public.sections
WHERE grade_level = 10
  AND school_year = '2025-2026'
  AND id::text LIKE 'ca000000-%'
GROUP BY track_strand
ORDER BY track_strand;
