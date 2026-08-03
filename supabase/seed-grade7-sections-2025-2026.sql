-- =============================================================================
-- DMDPNHS Portal — Grade 7 sections seed (SY 2025-2026)
-- 17 regular sections + 2 SNED/LWD sections
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
  -- Stable UUIDs (c7 = Grade 7 seed namespace)
  sec_spstem_green   uuid := 'c7000000-0000-4000-8000-000000000001';
  sec_spstem_red     uuid := 'c7000000-0000-4000-8000-000000000002';
  sec_amethyst       uuid := 'c7000000-0000-4000-8000-000000000003';
  sec_amber          uuid := 'c7000000-0000-4000-8000-000000000004';
  sec_aquamarine     uuid := 'c7000000-0000-4000-8000-000000000005';
  sec_emerald        uuid := 'c7000000-0000-4000-8000-000000000006';
  sec_garnet         uuid := 'c7000000-0000-4000-8000-000000000007';
  sec_gypsum         uuid := 'c7000000-0000-4000-8000-000000000008';
  sec_jade           uuid := 'c7000000-0000-4000-8000-000000000009';
  sec_opal           uuid := 'c7000000-0000-4000-8000-00000000000a';
  sec_pearl          uuid := 'c7000000-0000-4000-8000-00000000000b';
  sec_quartz         uuid := 'c7000000-0000-4000-8000-00000000000c';
  sec_ruby           uuid := 'c7000000-0000-4000-8000-00000000000d';
  sec_sapphire       uuid := 'c7000000-0000-4000-8000-00000000000e';
  sec_topaz          uuid := 'c7000000-0000-4000-8000-00000000000f';
  sec_tourmaline     uuid := 'c7000000-0000-4000-8000-000000000010';
  sec_zircon         uuid := 'c7000000-0000-4000-8000-000000000011';
  sec_lwd_hope       uuid := 'c7000000-0000-4000-8000-000000000012';
  sec_lwd_love       uuid := 'c7000000-0000-4000-8000-000000000013';

  grade7_ids uuid[] := ARRAY[
    sec_spstem_green, sec_spstem_red, sec_amethyst, sec_amber, sec_aquamarine,
    sec_emerald, sec_garnet, sec_gypsum, sec_jade, sec_opal, sec_pearl,
    sec_quartz, sec_ruby, sec_sapphire, sec_topaz, sec_tourmaline, sec_zircon,
    sec_lwd_hope, sec_lwd_love
  ];

  grade7_names text[] := ARRAY[
    -- current names (no grade prefix — grade lives in grade_level)
    'SPSTEM GREEN DIAMOND',
    'SPSTEM RED DIAMOND',
    'AMETHYST',
    'AMBER',
    'AQUAMARINE',
    'EMERALD',
    'GARNET',
    'GYPSUM',
    'JADE',
    'OPAL',
    'PEARL',
    'QUARTZ',
    'RUBY',
    'SAPPHIRE',
    'TOPAZ',
    'TOURMALINE',
    'ZIRCON',
    'LWD - Hope',
    'LWD - Love',
    -- legacy prefixed names (cleanup if re-seeding)
    'GRADE 7 - SPSTEM GREEN DIAMOND',
    'GRADE 7 - SPSTEM RED DIAMOND',
    'GRADE 7 - AMETHYST',
    'GRADE 7 - AMBER',
    'GRADE 7 - AQUAMARINE',
    'GRADE 7 - EMERALD',
    'GRADE 7 - GARNET',
    'GRADE 7 - GYPSUM',
    'GRADE 7 - JADE',
    'GRADE 7 - OPAL',
    'GRADE 7 - PEARL',
    'GRADE 7 - QUARTZ',
    'GRADE 7 - RUBY',
    'GRADE 7 - SAPPHIRE',
    'GRADE 7 - TOPAZ',
    'GRADE 7 - TOURMALINE',
    'GRADE 7 - ZIRCON'
  ];
BEGIN
  -- --------------------------------------------------------------------------
  -- 2) Cleanup prior Grade 7 seed for this school year
  -- --------------------------------------------------------------------------
  -- Detach students pointing at these sections so FK deletes stay clean
  UPDATE public.students
  SET section_id = NULL
  WHERE section_id = ANY (grade7_ids)
     OR section_id IN (
          SELECT id
          FROM public.sections
          WHERE grade_level = 7
            AND school_year = '2025-2026'
            AND section_name = ANY (grade7_names)
        );

  -- Drop dependent academic links for these sections (if tables exist)
  IF to_regclass('public.attendance') IS NOT NULL THEN
    DELETE FROM public.attendance
    WHERE section_id = ANY (grade7_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 7
              AND school_year = '2025-2026'
              AND section_name = ANY (grade7_names)
          );
  END IF;

  IF to_regclass('public.school_events') IS NOT NULL THEN
    DELETE FROM public.school_events
    WHERE section_id = ANY (grade7_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 7
              AND school_year = '2025-2026'
              AND section_name = ANY (grade7_names)
          );
  END IF;

  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    DELETE FROM public.teacher_assignments
    WHERE section_id = ANY (grade7_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 7
              AND school_year = '2025-2026'
              AND section_name = ANY (grade7_names)
          );
  END IF;

  IF to_regclass('public.class_schedules') IS NOT NULL THEN
    DELETE FROM public.class_schedules
    WHERE section_id = ANY (grade7_ids)
       OR section_id IN (
            SELECT id FROM public.sections
            WHERE grade_level = 7
              AND school_year = '2025-2026'
              AND section_name = ANY (grade7_names)
          );
  END IF;

  DELETE FROM public.sections
  WHERE id = ANY (grade7_ids)
     OR (
          grade_level = 7
          AND school_year = '2025-2026'
          AND section_name = ANY (grade7_names)
        );

  -- --------------------------------------------------------------------------
  -- 3) Insert Grade 7 sections
  --    adviser_id resolved from teachers.profiles when names match.
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
    7 AS grade_level,
    '2025-2026'::text AS school_year,
    t.id AS adviser_id,
    v.adviser_name,
    v.location,
    v.capacity,
    v.male_count,
    v.female_count
  FROM (
    VALUES
      -- Regular sections
      (sec_spstem_green, 'SPSTEM GREEN DIAMOND', 'Ms. Rianne Karla Gandia',           'FQL Bldg. 8, 2nd floor',                 45, 20, 19, 'Rianne Karla', 'Gandia'),
      (sec_spstem_red,   'SPSTEM RED DIAMOND',   'Ms. Ceriza Villafuerte Villaverde',  'FQL Bldg. 8, 2nd floor',                 45, 18, 21, 'Ceriza Villafuerte', 'Villaverde'),
      (sec_amethyst,     'AMETHYST',             'Ms. Dorothy Calubayan Villamena',    'Megawide Bldg. 4, 1st floor',            45, 22, 18, 'Dorothy Calubayan', 'Villamena'),
      (sec_amber,        'AMBER',                'Mr. Christian Bamba Fajutagana',     'Megawide Bldg. 4, 2nd floor',            45, 21, 19, 'Christian Bamba', 'Fajutagana'),
      (sec_aquamarine,   'AQUAMARINE',           'Ms. Renna Cabusin Santayana',        'FQL Bldg. 8, 1st floor',                 50, 22, 20, 'Renna Cabusin', 'Santayana'),
      (sec_emerald,      'EMERALD',              'Ms. Ailene Petaez Sumagaysay',       'Megawide Bldg. 4, 1st floor',            45, 21, 19, 'Ailene Petaez', 'Sumagaysay'),
      (sec_garnet,       'GARNET',               'Ms. Edelyn Gamuga Villaverde',       'Megawide Bldg. 4, 1st floor',            45, 22, 18, 'Edelyn Gamuga', 'Villaverde'),
      (sec_gypsum,       'GYPSUM',               'Ms. Jisette De San Juan Nantes',     'New DepEd Bldg. 1 (Private Canteen)',    40, 19, 17, 'Jisette De San Juan', 'Nantes'),
      (sec_jade,         'JADE',                 'Ms. Mary Rose Imperio Pastores',     'New DepEd Bldg. 1 (Private Canteen)',    40, 21, 15, 'Mary Rose Imperio', 'Pastores'),
      (sec_opal,         'OPAL',                 'Ms. Abegail Fullante',               'New DepEd Bldg. 1 (Private Canteen)',    40, 21, 15, 'Abegail', 'Fullante'),
      (sec_pearl,        'PEARL',                'Ms. Marrienel Benitez',              'New DepEd Bldg. 1 (Private Canteen)',    40, 20, 16, 'Marrienel', 'Benitez'),
      (sec_quartz,       'QUARTZ',               'Ms. Joelyn Virrey Mangampo',         'RPN Bldg. 3, 1st floor',                 47, 23, 17, 'Joelyn Virrey', 'Mangampo'),
      (sec_ruby,         'RUBY',                 'Ms. Renie Melabaguio Silong',        'RPB Bldg. 2',                            40, 18, 19, 'Renie Melabaguio', 'Silong'),
      (sec_sapphire,     'SAPPHIRE',             'Ms. Camille Claire Almarjar',        'Megawide Bldg. 4, 2nd floor',            45, 23, 17, 'Camille Claire', 'Almarjar'),
      (sec_topaz,        'TOPAZ',                'Ms. Jellen Tampoc Buizar',           'Old Pastrana Bldg. 5 (School Canteen)',  45, 21, 19, 'Jellen Tampoc', 'Buizar'),
      (sec_tourmaline,   'TOURMALINE',           'Ms. Jerlin Talsic Argelles',         'Old Pastrana Bldg. 5 (School Canteen)',  45, 23, 17, 'Jerlin Talsic', 'Argelles'),
      (sec_zircon,       'ZIRCON',               'Ms. Odezza Niva Potencio',           'Megawide Bldg. 4, 2nd floor',            45, 21, 19, 'Odezza Niva', 'Potencio'),
      -- SNED / LWD
      (sec_lwd_hope,     'LWD - Hope',                     'Ma''am Imperio',                    'SNED DepEd 1 Bldg. 10',                  40, 13,  5, 'Mary Rose Imperio', 'Pastores'),
      (sec_lwd_love,     'LWD - Love',                     'Sir Gandia',                         'SNED DepEd 1 Bldg. 10',                  40, 25, 17, 'Rianne Karla', 'Gandia')
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

  RAISE NOTICE 'Seeded % Grade 7 sections for SY 2025-2026.',
    (SELECT count(*) FROM public.sections
      WHERE grade_level = 7
        AND school_year = '2025-2026'
        AND id = ANY (grade7_ids));
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
WHERE grade_level = 7
  AND school_year = '2025-2026'
  AND id::text LIKE 'c7000000-%'
ORDER BY
  CASE WHEN section_name LIKE 'LWD%' THEN 1 ELSE 0 END,
  section_name;
