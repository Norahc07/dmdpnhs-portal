-- =============================================================================
-- DMDPNHS Portal — Grade 9 sections seed (SY 2025-2026)
-- 17 sections with JHS track specializations (ICT / FCS / AFA)
--
-- Run in Supabase SQL Editor.
-- Safe to re-run: removes prior rows for these fixed UUIDs / names, then reseeds.
--
-- Notes:
--   • Core columns: section_name, grade_level, school_year, adviser_id
--   • Extra school metadata columns are added if missing:
--       location, capacity, male_count, female_count, adviser_name, track_strand
--   • track_strand stores the section specialization (ICT, FCS (Cooking), AFA)
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
  -- Stable UUIDs (c9 = Grade 9 seed namespace)
  sec_carbonyl_1 uuid := 'c9000000-0000-4000-8000-000000000001';
  sec_carbonyl_2 uuid := 'c9000000-0000-4000-8000-000000000002';
  sec_acetate    uuid := 'c9000000-0000-4000-8000-000000000003';
  sec_aldehydes  uuid := 'c9000000-0000-4000-8000-000000000004';
  sec_alkane     uuid := 'c9000000-0000-4000-8000-000000000005';
  sec_amines     uuid := 'c9000000-0000-4000-8000-000000000006';
  sec_benzene    uuid := 'c9000000-0000-4000-8000-000000000007';
  sec_ester      uuid := 'c9000000-0000-4000-8000-000000000008';
  sec_ether      uuid := 'c9000000-0000-4000-8000-000000000009';
  sec_halides    uuid := 'c9000000-0000-4000-8000-00000000000a';
  sec_hydronide  uuid := 'c9000000-0000-4000-8000-00000000000b';
  sec_ketones    uuid := 'c9000000-0000-4000-8000-00000000000c';
  sec_nitrite    uuid := 'c9000000-0000-4000-8000-00000000000d';
  sec_peroxide   uuid := 'c9000000-0000-4000-8000-00000000000e';
  sec_phosphate  uuid := 'c9000000-0000-4000-8000-00000000000f';
  sec_sulfides   uuid := 'c9000000-0000-4000-8000-000000000010';
  sec_toluene    uuid := 'c9000000-0000-4000-8000-000000000011';

  grade9_ids uuid[] := ARRAY[
    sec_carbonyl_1, sec_carbonyl_2, sec_acetate, sec_aldehydes, sec_alkane,
    sec_amines, sec_benzene, sec_ester, sec_ether, sec_halides, sec_hydronide,
    sec_ketones, sec_nitrite, sec_peroxide, sec_phosphate, sec_sulfides,
    sec_toluene
  ];

  grade9_names text[] := ARRAY[
    'SPSTEM CARBONYL 1',
    'SPSTEM CARBONYL 2',
    'ACETATE',
    'ALDEHYDES',
    'ALKANE',
    'AMINES',
    'BENZENE',
    'ESTER',
    'ETHER',
    'HALIDES',
    'HYDRONIDE',
    'KETONES',
    'NITRITE',
    'PEROXIDE',
    'PHOSPHATE',
    'SULFIDES',
    'TOLUENE',
    -- legacy
    'GRADE 9 SPSTEM CARBONYL 1',
    'GRADE 9 SPSTEM CARBONYL 2',
    'GRADE 9 ACETATE',
    'GRADE 9 ALDEHYDES',
    'GRADE 9 ALKANE',
    'GRADE 9 AMINES',
    'GRADE 9 BENZENE',
    'GRADE 9 ESTER',
    'GRADE 9 ETHER',
    'GRADE 9 HALIDES',
    'GRADE 9 HYDRONIDE',
    'GRADE 9 KETONES',
    'GRADE 9 NITRITE',
    'GRADE 9 PEROXIDE',
    'GRADE 9 PHOSPHATE',
    'GRADE 9 SULFIDES',
    'GRADE 9 TOLUENE'
  ];
BEGIN
  -- --------------------------------------------------------------------------
  -- 2) Cleanup prior Grade 9 seed for this school year
  -- --------------------------------------------------------------------------
  UPDATE public.students
  SET section_id = NULL
  WHERE section_id = ANY (grade9_ids)
     OR section_id IN (
          SELECT id
          FROM public.sections
          WHERE grade_level = 9
            AND school_year = '2025-2026'
            AND section_name = ANY (grade9_names)
        );

  IF to_regclass('public.attendance') IS NOT NULL THEN
    DELETE FROM public.attendance
    WHERE section_id = ANY (grade9_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 9
              AND school_year = '2025-2026'
              AND section_name = ANY (grade9_names)
          );
  END IF;

  IF to_regclass('public.school_events') IS NOT NULL THEN
    DELETE FROM public.school_events
    WHERE section_id = ANY (grade9_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 9
              AND school_year = '2025-2026'
              AND section_name = ANY (grade9_names)
          );
  END IF;

  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    DELETE FROM public.teacher_assignments
    WHERE section_id = ANY (grade9_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 9
              AND school_year = '2025-2026'
              AND section_name = ANY (grade9_names)
          );
  END IF;

  IF to_regclass('public.class_schedules') IS NOT NULL THEN
    DELETE FROM public.class_schedules
    WHERE section_id = ANY (grade9_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 9
              AND school_year = '2025-2026'
              AND section_name = ANY (grade9_names)
          );
  END IF;

  DELETE FROM public.sections
  WHERE id = ANY (grade9_ids)
     OR (
          grade_level = 9
          AND school_year = '2025-2026'
          AND section_name = ANY (grade9_names)
        );

  -- --------------------------------------------------------------------------
  -- 3) Insert Grade 9 sections
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
    9 AS grade_level,
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
      (sec_carbonyl_1, 'SPSTEM CARBONYL 1', 'ICT',           'Ms. Aiza Rizza M. Maningas',     'FQL Bldg. 8, 2nd floor',               50,  8, 27, 'Aiza Rizza M.', 'Maningas'),
      (sec_carbonyl_2, 'SPSTEM CARBONYL 2', 'ICT',           'Ms. Lucelyn Nories Almacen',     'FQL Bldg. 8, 2nd floor',               50,  8, 27, 'Lucelyn Nories', 'Almacen'),
      (sec_acetate,    'ACETATE',           'ICT',           'Mr. Rexon Orbeta Aceso',         'RPN Bldg. 3, 2nd floor',               47, 25, 20, 'Rexon Orbeta', 'Aceso'),
      (sec_aldehydes,  'ALDEHYDES',         'FCS (Cooking)', 'Mr. Don Allen Jarq Gequinto',    'RPB Bldg. 2',                          40, 25, 20, 'Don Allen Jarq', 'Gequinto'),
      (sec_alkane,     'ALKANE',            'FCS (Cooking)', 'Ms. Christine Ivy Mamog',        'FQL Bldg. 8, 2nd floor',               50, 20, 25, 'Christine Ivy', 'Mamog'),
      (sec_amines,     'AMINES',            'AFA',           'Ms. Eunice Gocon Maraguinot',    'DepEd Bldg. (Back-SHS) 7, 1st floor',  45, 27, 20, 'Eunice Gocon', 'Maraguinot'),
      (sec_benzene,    'BENZENE',           'AFA',           'Mr. Christofer D. Sta. Ana',     'Chinese Chamber Bldg. 9',              40, 28, 18, 'Christofer D.', 'Sta. Ana'),
      (sec_ester,      'ESTER',             'AFA',           'Ms. Mary Ann Sant Torres',       'Chinese Chamber Bldg. 9',              40, 26, 17, 'Mary Ann Sant', 'Torres'),
      (sec_ether,      'ETHER',             'ICT',           'Mr. Romiel Saguni Condonar',     'DepEd 1 Bldg. 10',                     40, 19, 26, 'Romiel Saguni', 'Condonar'),
      (sec_halides,    'HALIDES',           'ICT',           'Ms. Sheila Rose U. Cueladro',    'Chinese Chamber Bldg. 9',              40, 24, 19, 'Sheila Rose U.', 'Cueladro'),
      (sec_hydronide,  'HYDRONIDE',         'AFA',           'Ms. Lalaine Brugada Puerta',     'DepEd Bldg. (Back-SHS) 7, 2nd floor',  45, 27, 19, 'Lalaine Brugada', 'Puerta'),
      (sec_ketones,    'KETONES',           'FCS (Cooking)', 'Ms. Ma. Federiza Talabong',      'RPN Bldg. 3, 1st floor',               47, 16, 27, 'Ma. Federiza', 'Talabong'),
      (sec_nitrite,    'NITRITE',           'FCS (Cooking)', 'Ms. Mara Clara F. Camota',       'Chinese Chamber Bldg. 9',              40, 24, 22, 'Mara Clara F.', 'Camota'),
      (sec_peroxide,   'PEROXIDE',          'FCS (Cooking)', 'Mr. Michael Devan Canagcho',     'DepEd Bldg. (Back-SHS) 7, 1st floor',  45, 20, 25, 'Michael Devan', 'Canagcho'),
      (sec_phosphate,  'PHOSPHATE',         'ICT',           'Ms. Christine Joy Carias',       'RPN Bldg. 3, 2nd floor',               47, 19, 27, 'Christine Joy', 'Carias'),
      (sec_sulfides,   'SULFIDES',          'ICT',           'Ms. Lineth Luna Santagana',      'FQL Bldg. 8, 1st floor',               50, 19, 26, 'Lineth Luna', 'Santagana'),
      (sec_toluene,    'TOLUENE',           'AFA',           'Ms. Maricel Abos Ella',          'DepEd 1 Bldg. 10',                     40, 20, 22, 'Maricel Abos', 'Ella')
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

  RAISE NOTICE 'Seeded % Grade 9 sections for SY 2025-2026.',
    (SELECT count(*) FROM public.sections
      WHERE grade_level = 9
        AND school_year = '2025-2026'
        AND id = ANY (grade9_ids));
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
WHERE grade_level = 9
  AND school_year = '2025-2026'
  AND id::text LIKE 'c9000000-%'
ORDER BY track_strand, section_name;

-- Track summary
SELECT
  track_strand,
  count(*) AS sections,
  coalesce(sum(male_count), 0) AS male,
  coalesce(sum(female_count), 0) AS female,
  coalesce(sum(male_count + female_count), 0) AS enrolled
FROM public.sections
WHERE grade_level = 9
  AND school_year = '2025-2026'
  AND id::text LIKE 'c9000000-%'
GROUP BY track_strand
ORDER BY track_strand;
