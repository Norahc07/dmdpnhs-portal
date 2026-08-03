-- =============================================================================
-- DMDPNHS Portal — Grade 8 sections seed (SY 2025-2026)
-- 18 sections (incl. 2 SPSTEM)
--
-- Run in Supabase SQL Editor.
-- Safe to re-run: removes prior rows for these fixed UUIDs / names, then reseeds.
--
-- Notes:
--   • Core columns: section_name, grade_level, school_year, adviser_id
--   • Extra school metadata columns are added if missing:
--       location, capacity, male_count, female_count, adviser_name
--   • adviser_id is linked when a matching teacher profile already exists
--     (first + last name, case-insensitive). Otherwise adviser_id stays NULL
--     and adviser_name still stores the official adviser label.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 1) Ensure sections can store school roster metadata
-- --------------------------------------------------------------------------
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS male_count integer,
  ADD COLUMN IF NOT EXISTS female_count integer,
  ADD COLUMN IF NOT EXISTS adviser_name text;

DO $$
DECLARE
  -- Stable UUIDs (c8 = Grade 8 seed namespace)
  sec_nucleolus     uuid := 'c8000000-0000-4000-8000-000000000001';
  sec_nucleus       uuid := 'c8000000-0000-4000-8000-000000000002';
  sec_cell_membrane uuid := 'c8000000-0000-4000-8000-000000000003';
  sec_centrioles    uuid := 'c8000000-0000-4000-8000-000000000004';
  sec_centrosome    uuid := 'c8000000-0000-4000-8000-000000000005';
  sec_chloroplast   uuid := 'c8000000-0000-4000-8000-000000000006';
  sec_chromosome    uuid := 'c8000000-0000-4000-8000-000000000007';
  sec_cytoplasm     uuid := 'c8000000-0000-4000-8000-000000000008';
  sec_golgi         uuid := 'c8000000-0000-4000-8000-000000000009';
  sec_leucoplast    uuid := 'c8000000-0000-4000-8000-00000000000a';
  sec_lysosome      uuid := 'c8000000-0000-4000-8000-00000000000b';
  sec_mitochondria  uuid := 'c8000000-0000-4000-8000-00000000000c';
  sec_peroxisome    uuid := 'c8000000-0000-4000-8000-00000000000d';
  sec_plasmodesma   uuid := 'c8000000-0000-4000-8000-00000000000e';
  sec_plastid       uuid := 'c8000000-0000-4000-8000-00000000000f';
  sec_ribosome      uuid := 'c8000000-0000-4000-8000-000000000010';
  sec_vacuole       uuid := 'c8000000-0000-4000-8000-000000000011';
  sec_vesicle       uuid := 'c8000000-0000-4000-8000-000000000012';

  grade8_ids uuid[] := ARRAY[
    sec_nucleolus, sec_nucleus, sec_cell_membrane, sec_centrioles, sec_centrosome,
    sec_chloroplast, sec_chromosome, sec_cytoplasm, sec_golgi, sec_leucoplast,
    sec_lysosome, sec_mitochondria, sec_peroxisome, sec_plasmodesma, sec_plastid,
    sec_ribosome, sec_vacuole, sec_vesicle
  ];

  grade8_names text[] := ARRAY[
    'SPSTEM NUCLEOLUS',
    'SPSTEM NUCLEUS',
    'CELL MEMBRANE',
    'CENTRIOLES',
    'CENTROSOME',
    'CHLOROPLAST',
    'CHROMOSOME',
    'CYTOPLASM',
    'GOLGI',
    'LEUCOPLAST',
    'LYSOSOME',
    'MITOCHONDRIA',
    'PEROXISOME',
    'PLASMODESMA',
    'PLASTID',
    'RIBOSOME',
    'VACUOLE',
    'VESICLE',
    -- legacy
    'GRADE 8 SPSTEM NUCLEOLUS',
    'GRADE 8 SPSTEM NUCLEUS',
    'GRADE 8 CELL MEMBRANE',
    'GRADE 8 CENTRIOLES',
    'GRADE 8 CENTROSOME',
    'GRADE 8 CHLOROPLAST',
    'GRADE 8 CHROMOSOME',
    'GRADE 8 CYTOPLASM',
    'GRADE 8 GOLGI',
    'GRADE 8 LEUCOPLAST',
    'GRADE 8 LYSOSOME',
    'GRADE 8 MITOCHONDRIA',
    'GRADE 8 PEROXISOME',
    'GRADE 8 PLASMODESMA',
    'GRADE 8 PLASTID',
    'GRADE 8 RIBOSOME',
    'GRADE 8 VACUOLE',
    'GRADE 8 VESICLE'
  ];
BEGIN
  -- --------------------------------------------------------------------------
  -- 2) Cleanup prior Grade 8 seed for this school year
  -- --------------------------------------------------------------------------
  UPDATE public.students
  SET section_id = NULL
  WHERE section_id = ANY (grade8_ids)
     OR section_id IN (
          SELECT id
          FROM public.sections
          WHERE grade_level = 8
            AND school_year = '2025-2026'
            AND section_name = ANY (grade8_names)
        );

  IF to_regclass('public.attendance') IS NOT NULL THEN
    DELETE FROM public.attendance
    WHERE section_id = ANY (grade8_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 8
              AND school_year = '2025-2026'
              AND section_name = ANY (grade8_names)
          );
  END IF;

  IF to_regclass('public.school_events') IS NOT NULL THEN
    DELETE FROM public.school_events
    WHERE section_id = ANY (grade8_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 8
              AND school_year = '2025-2026'
              AND section_name = ANY (grade8_names)
          );
  END IF;

  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    DELETE FROM public.teacher_assignments
    WHERE section_id = ANY (grade8_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 8
              AND school_year = '2025-2026'
              AND section_name = ANY (grade8_names)
          );
  END IF;

  IF to_regclass('public.class_schedules') IS NOT NULL THEN
    DELETE FROM public.class_schedules
    WHERE section_id = ANY (grade8_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 8
              AND school_year = '2025-2026'
              AND section_name = ANY (grade8_names)
          );
  END IF;

  DELETE FROM public.sections
  WHERE id = ANY (grade8_ids)
     OR (
          grade_level = 8
          AND school_year = '2025-2026'
          AND section_name = ANY (grade8_names)
        );

  -- --------------------------------------------------------------------------
  -- 3) Insert Grade 8 sections
  -- --------------------------------------------------------------------------
  INSERT INTO public.sections (
    id,
    section_name,
    grade_level,
    school_year,
    adviser_id,
    adviser_name,
    location,
    capacity,
    male_count,
    female_count
  )
  SELECT
    v.id,
    v.section_name,
    8 AS grade_level,
    '2025-2026'::text AS school_year,
    t.id AS adviser_id,
    v.adviser_name,
    v.location,
    v.capacity,
    v.male_count,
    v.female_count
  FROM (
    VALUES
      (sec_nucleolus,     'SPSTEM NUCLEOLUS', 'Mr. Harold Bert Distor',        'FQL Bldg. 8, 1st floor',                50, 17, 23, 'Harold Bert', 'Distor'),
      (sec_nucleus,       'SPSTEM NUCLEUS',   'Mr. Oliver Bojo Cajan',          'FQL Bldg. 8, 1st floor',                50, 18, 22, 'Oliver Bojo', 'Cajan'),
      (sec_cell_membrane, 'CELL MEMBRANE',    'Mr. Jowell Macarai Mandrique',   'RPN Bldg. 3, 1st floor',                47, 21, 21, 'Jowell Macarai', 'Mandrique'),
      (sec_centrioles,    'CENTRIOLES',       'Ms. Rochel Peñamora Javier',     'Old Pastrana Bldg. 5 (School Canteen)', 45, 20, 20, 'Rochel Peñamora', 'Javier'),
      (sec_centrosome,    'CENTROSOME',       'Ms. Ma. Warlene Decena Andres',  'New DepEd Bldg. 1 (Private Canteen)',   40, 18, 22, 'Ma. Warlene Decena', 'Andres'),
      (sec_chloroplast,   'CHLOROPLAST',      'Mr. Aljon Encanto Camacho',      'New DepEd Bldg. 1 (Private Canteen)',   40, 20, 21, 'Aljon Encanto', 'Camacho'),
      (sec_chromosome,    'CHROMOSOME',       'Ms. Kenlie Refogio Obigas',      'New DepEd Bldg. 1 (Private Canteen)',   40, 19, 22, 'Kenlie Refogio', 'Obigas'),
      (sec_cytoplasm,     'CYTOPLASM',        'Ms. Eloisa Verzonilla',          'New DepEd Bldg. 1 (Private Canteen)',   40, 21, 19, 'Eloisa', 'Verzonilla'),
      (sec_golgi,         'GOLGI',            'Ms. Mary Ann Beli Encanto',      'RPB Bldg. 2',                           40, 21, 18, 'Mary Ann Beli', 'Encanto'),
      (sec_leucoplast,    'LEUCOPLAST',       'Ms. Richelle Masirag Alpajora',  'Megawide Bldg. 4, 2nd floor',           45, 24, 15, 'Richelle Masirag', 'Alpajora'),
      (sec_lysosome,      'LYSOSOME',         'Ms. Loisy Grace Remorosa',       'Megawide Bldg. 4, 1st floor',           45, 21, 20, 'Loisy Grace', 'Remorosa'),
      (sec_mitochondria,  'MITOCHONDRIA',     'Ms. Liezel Legaspi Monteverde',  'RPN Bldg. 3, 2nd floor',                47, 18, 23, 'Liezel Legaspi', 'Monteverde'),
      (sec_peroxisome,    'PEROXISOME',       'Ms. Josielyn Aguel Rocafort',    'FQL Bldg. 8, 1st floor',                50, 27, 16, 'Josielyn Aguel', 'Rocafort'),
      (sec_plasmodesma,   'PLASMODESMA',      'Ms. Dhianne Frec Yanto',         'Old Pastrana Bldg. 5 (School Canteen)', 45, 20, 20, 'Dhianne Frec', 'Yanto'),
      (sec_plastid,       'PLASTID',          'Ms. Kimberly Bala Añonuevo',     'Megawide Bldg. 4, 2nd floor',           45, 20, 21, 'Kimberly Bala', 'Añonuevo'),
      (sec_ribosome,      'RIBOSOME',         'Ms. Hazel Laus Quartero',        'Megawide Bldg. 4, 1st floor',           45, 19, 22, 'Hazel Laus', 'Quartero'),
      (sec_vacuole,       'VACUOLE',          'Mr. Daniel Pintor Gequinto',     'Megawide Bldg. 4, 2nd floor',           45, 20, 20, 'Daniel Pintor', 'Gequinto'),
      (sec_vesicle,       'VESICLE',          'Mr. Ronian Hinagpis Zamora',     'Megawide Bldg. 4, 1st floor',           45, 18, 22, 'Ronian Hinagpis', 'Zamora')
  ) AS v(
    id,
    section_name,
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

  RAISE NOTICE 'Seeded % Grade 8 sections for SY 2025-2026.',
    (SELECT count(*) FROM public.sections
      WHERE grade_level = 8
        AND school_year = '2025-2026'
        AND id = ANY (grade8_ids));
END $$;

-- --------------------------------------------------------------------------
-- 4) Quick verification
-- --------------------------------------------------------------------------
SELECT
  section_name,
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
WHERE grade_level = 8
  AND school_year = '2025-2026'
  AND id::text LIKE 'c8000000-%'
ORDER BY section_name;
