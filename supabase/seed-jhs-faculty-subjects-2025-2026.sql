-- =============================================================================
-- DMDPNHS Portal — JHS faculty, departments, subjects + adviser linking
-- SY 2025-2026 · Grades 7–10
--
-- Run AFTER:
--   1) grade-validation-upgrade.sql   (departments + teacher.department_id)
--   2) seed-grade7/8/9/10-sections-2025-2026.sql
--
-- What this does:
--   • Seeds JHS departments (English, Math, Science, ICT, AFA, FCS, Drafting…)
--   • Seeds core + track subjects for Grades 7–10
--   • Creates active teacher accounts from sections.adviser_name
--   • Links sections.adviser_id to those teacher rows
--   • Creates sample teacher_assignments (adviser ↔ section ↔ matching subject)
--
-- Demo teacher login (all seeded advisers):
--   Email:    <firstname>.<lastname>@dmdpnhs.edu.ph  (sanitized)
--   Password: Teacher@2026
--
-- Note: Do NOT need to toggle RLS for this seed — SQL Editor runs as a
-- privileged role that bypasses RLS. The earlier error was a foreign-key
-- mismatch (department UUID), not RLS.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
SET search_path = public, extensions;

-- Ensure faculty columns exist even if grade-validation-upgrade wasn't run yet
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  band text NOT NULL DEFAULT 'jhs'
    CHECK (band IN ('jhs', 'shs', 'all')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, band)
);

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS faculty_position text NOT NULL DEFAULT 'teacher';

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS male_count integer,
  ADD COLUMN IF NOT EXISTS female_count integer,
  ADD COLUMN IF NOT EXISTS adviser_name text,
  ADD COLUMN IF NOT EXISTS track_strand text;

-- --------------------------------------------------------------------------
-- 1) Departments (JHS) — insert if missing (works with/without grade_level unique)
-- --------------------------------------------------------------------------
INSERT INTO public.departments (name, band, description)
SELECT v.name, v.band, v.description
FROM (
  VALUES
    ('English',              'jhs', 'English language arts'),
    ('Filipino',             'jhs', 'Filipino language'),
    ('Mathematics',         'jhs', 'Junior high mathematics'),
    ('Science',             'jhs', 'Junior high science'),
    ('Araling Panlipunan',  'jhs', 'Social studies'),
    ('MAPEH',               'jhs', 'Music, Arts, PE, Health'),
    ('Values Education',    'jhs', 'Edukasyon sa Pagpapakatao'),
    ('ICT',                 'jhs', 'Information & Communications Technology / TLE'),
    ('AFA',                 'jhs', 'Agri-Fishery Arts / TLE'),
    ('FCS / Cookery',       'jhs', 'Family & Consumer Science / Cookery TLE'),
    ('Drafting',            'jhs', 'Technical drafting / Industrial arts')
) AS v(name, band, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.departments d
  WHERE d.name = v.name
    AND d.band = v.band
);

-- --------------------------------------------------------------------------
-- 2) Subjects Grades 7–10 (core + track TLE)
--    department_id resolved by department name (avoids fixed-UUID FK mismatches)
-- --------------------------------------------------------------------------
WITH subj(
  id, subject_name, grade_level, track_strand, department_name, w, p, a
) AS (
  VALUES
    -- Grade 7 core
    ('e1000000-0000-4000-8000-000000000101'::uuid, 'English',             7, NULL::text, 'English', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000102'::uuid, 'Filipino',            7, NULL,       'Filipino', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000103'::uuid, 'Mathematics',        7, NULL,       'Mathematics', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000104'::uuid, 'Science',            7, NULL,       'Science', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000105'::uuid, 'Araling Panlipunan', 7, NULL,       'Araling Panlipunan', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000106'::uuid, 'MAPEH',              7, NULL,       'MAPEH', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000107'::uuid, 'Values Education',   7, NULL,       'Values Education', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000108'::uuid, 'TLE',                7, NULL,       'ICT', 20, 60, 20),

    -- Grade 8 core
    ('e1000000-0000-4000-8000-000000000201'::uuid, 'English',             8, NULL, 'English', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000202'::uuid, 'Filipino',            8, NULL, 'Filipino', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000203'::uuid, 'Mathematics',        8, NULL, 'Mathematics', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000204'::uuid, 'Science',            8, NULL, 'Science', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000205'::uuid, 'Araling Panlipunan', 8, NULL, 'Araling Panlipunan', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000206'::uuid, 'MAPEH',              8, NULL, 'MAPEH', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000207'::uuid, 'Values Education',   8, NULL, 'Values Education', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000208'::uuid, 'TLE',                8, NULL, 'ICT', 20, 60, 20),

    -- Grade 9 core + tracks
    ('e1000000-0000-4000-8000-000000000301'::uuid, 'English',             9, NULL,            'English', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000302'::uuid, 'Filipino',            9, NULL,            'Filipino', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000303'::uuid, 'Mathematics',        9, NULL,            'Mathematics', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000304'::uuid, 'Science',            9, NULL,            'Science', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000305'::uuid, 'Araling Panlipunan', 9, NULL,            'Araling Panlipunan', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000306'::uuid, 'MAPEH',              9, NULL,            'MAPEH', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000307'::uuid, 'Values Education',   9, NULL,            'Values Education', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000308'::uuid, 'TLE',                9, 'ICT',          'ICT', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000309'::uuid, 'TLE',                9, 'FCS (Cooking)', 'FCS / Cookery', 20, 60, 20),
    ('e1000000-0000-4000-8000-00000000030a'::uuid, 'TLE',                9, 'AFA',          'AFA', 20, 60, 20),

    -- Grade 10 core + tracks
    ('e1000000-0000-4000-8000-000000000401'::uuid, 'English',             10, NULL,                      'English', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000402'::uuid, 'Filipino',            10, NULL,                      'Filipino', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000403'::uuid, 'Mathematics',        10, NULL,                      'Mathematics', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000404'::uuid, 'Science',            10, NULL,                      'Science', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000405'::uuid, 'Araling Panlipunan', 10, NULL,                      'Araling Panlipunan', 40, 40, 20),
    ('e1000000-0000-4000-8000-000000000406'::uuid, 'MAPEH',              10, NULL,                      'MAPEH', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000407'::uuid, 'Values Education',   10, NULL,                      'Values Education', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000408'::uuid, 'TLE',                10, 'ICT',                    'ICT', 20, 60, 20),
    ('e1000000-0000-4000-8000-000000000409'::uuid, 'TLE',                10, 'Cookery',                'FCS / Cookery', 20, 60, 20),
    ('e1000000-0000-4000-8000-00000000040a'::uuid, 'TLE',                10, 'Drafting',               'Drafting', 20, 60, 20),
    ('e1000000-0000-4000-8000-00000000040b'::uuid, 'TLE',                10, 'Drafting (Special Eng)', 'Drafting', 20, 60, 20)
)
INSERT INTO public.subjects (
  id, subject_name, grade_level, track_strand, department_id,
  written_weight, performance_weight, assessment_weight
)
SELECT
  s.id,
  s.subject_name,
  s.grade_level,
  s.track_strand,
  d.id,
  s.w,
  s.p,
  s.a
FROM subj s
JOIN LATERAL (
  SELECT d.id
  FROM public.departments d
  WHERE d.name = s.department_name
    AND d.band = 'jhs'
  ORDER BY d.grade_level NULLS FIRST, d.created_at
  LIMIT 1
) d ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subjects x
  WHERE x.subject_name = s.subject_name
    AND x.grade_level = s.grade_level
    AND x.track_strand IS NOT DISTINCT FROM s.track_strand
)
ON CONFLICT (id) DO UPDATE
SET
  department_id = COALESCE(public.subjects.department_id, EXCLUDED.department_id),
  written_weight = EXCLUDED.written_weight,
  performance_weight = EXCLUDED.performance_weight,
  assessment_weight = EXCLUDED.assessment_weight;

DO $$
DECLARE
  r record;
  clean_name text;
  first_name text;
  last_name text;
  teacher_email text;
  profile_uid uuid;
  teacher_row_id uuid;
  teacher_code text;
  seq int := 20001;
  dept_id uuid;
  dept_name text;
  track text;
  subj_id uuid;
  asg_id uuid;
BEGIN
  IF to_regclass('public.teacher_assignments') IS NULL THEN
    RAISE EXCEPTION
      'teacher_assignments missing. Run supabase/class-record-upgrade.sql first.';
  END IF;

  -- ------------------------------------------------------------------------
  -- 3) Create teachers from distinct section advisers (Grades 7–10)
  -- ------------------------------------------------------------------------
  FOR r IN
    SELECT DISTINCT ON (
      lower(regexp_replace(coalesce(adviser_name, ''), '^(Ms\.|Mr\.|Ma''am|Sir)\s+', '', 'i'))
    )
      adviser_name,
      track_strand,
      grade_level
    FROM public.sections
    WHERE school_year = '2025-2026'
      AND grade_level BETWEEN 7 AND 10
      AND coalesce(adviser_name, '') <> ''
    ORDER BY
      lower(regexp_replace(coalesce(adviser_name, ''), '^(Ms\.|Mr\.|Ma''am|Sir)\s+', '', 'i')),
      grade_level
  LOOP
    clean_name := regexp_replace(
      btrim(r.adviser_name),
      '^(Ms\.|Mr\.|Ma''am|Sir)\s+',
      '',
      'i'
    );
    clean_name := btrim(clean_name);

    -- Special short labels from LWD seed
    IF lower(clean_name) IN ('imperio') THEN
      clean_name := 'Mary Rose Imperio Pastores';
    ELSIF lower(clean_name) IN ('gandia') THEN
      clean_name := 'Rianne Karla Gandia';
    END IF;

    IF position(' ' in clean_name) = 0 THEN
      first_name := clean_name;
      last_name := clean_name;
    ELSE
      last_name := regexp_replace(clean_name, '^.*\s+(\S+)$', '\1');
      first_name := btrim(regexp_replace(clean_name, '\s+\S+$', ''));
    END IF;

    teacher_email := lower(
      regexp_replace(
        regexp_replace(first_name || '.' || last_name, '[^a-zA-Z0-9.]+', '', 'g'),
        '\.+',
        '.',
        'g'
      )
    ) || '@dmdpnhs.edu.ph';

    -- Map track → department name, then look up real UUID
    track := coalesce(r.track_strand, '');
    IF track ILIKE '%ICT%' THEN
      dept_name := 'ICT';
    ELSIF track ILIKE '%AFA%' THEN
      dept_name := 'AFA';
    ELSIF track ILIKE '%FCS%' OR track ILIKE '%Cookery%' THEN
      dept_name := 'FCS / Cookery';
    ELSIF track ILIKE '%Draft%' THEN
      dept_name := 'Drafting';
    ELSIF r.grade_level = 8 THEN
      dept_name := 'Science';
    ELSE
      dept_name := 'English';
    END IF;

    SELECT d.id INTO dept_id
    FROM public.departments d
    WHERE d.name = dept_name AND d.band = 'jhs'
    LIMIT 1;

    IF dept_id IS NULL THEN
      RAISE EXCEPTION 'Department "%" (jhs) not found. Re-run department insert.', dept_name;
    END IF;

    -- Reuse existing auth user by email if present
    SELECT u.id INTO profile_uid
    FROM auth.users u
    WHERE u.email = teacher_email
    LIMIT 1;

    IF profile_uid IS NULL THEN
      profile_uid := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        profile_uid, 'authenticated', 'authenticated',
        teacher_email,
        crypt('Teacher@2026', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'role', 'teacher',
          'first_name', first_name,
          'last_name', last_name
        ),
        NOW(), NOW(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        profile_uid,
        jsonb_build_object(
          'sub', profile_uid::text,
          'email', teacher_email,
          'email_verified', true
        ),
        'email',
        profile_uid::text,
        NOW(), NOW(), NOW()
      );
    END IF;

    INSERT INTO public.profiles (id, role, first_name, last_name, email, status)
    VALUES (profile_uid, 'teacher', first_name, last_name, teacher_email, 'active')
    ON CONFLICT (id) DO UPDATE
    SET
      role = 'teacher',
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      status = 'active';

    SELECT t.id INTO teacher_row_id
    FROM public.teachers t
    WHERE t.profile_id = profile_uid
    LIMIT 1;

    IF teacher_row_id IS NULL THEN
      teacher_row_id := gen_random_uuid();
      teacher_code := 'T26-' || seq::text;
      seq := seq + 1;

      WHILE EXISTS (SELECT 1 FROM public.teachers WHERE teacher_id = teacher_code) LOOP
        teacher_code := 'T26-' || seq::text;
        seq := seq + 1;
      END LOOP;

      INSERT INTO public.teachers (
        id, profile_id, teacher_id, faculty_dept, units, department_id, faculty_position
      ) VALUES (
        teacher_row_id,
        profile_uid,
        teacher_code,
        dept_name,
        18,
        dept_id,
        'teacher'
      );
    ELSE
      UPDATE public.teachers
      SET
        department_id = coalesce(department_id, dept_id),
        faculty_dept = coalesce(nullif(faculty_dept, ''), dept_name),
        faculty_position = coalesce(faculty_position, 'teacher'),
        units = coalesce(units, 18)
      WHERE id = teacher_row_id;
    END IF;

    -- Link all sections that share this adviser label
    UPDATE public.sections s
    SET adviser_id = teacher_row_id
    WHERE s.school_year = '2025-2026'
      AND s.grade_level BETWEEN 7 AND 10
      AND (
        lower(btrim(s.adviser_name)) = lower(btrim(r.adviser_name))
        OR (
          lower(regexp_replace(coalesce(s.adviser_name, ''), '^(Ms\.|Mr\.|Ma''am|Sir)\s+', '', 'i'))
          = lower(clean_name)
        )
        OR (
          lower(btrim(s.adviser_name)) IN ('ma''am imperio', 'sir gandia')
          AND (
            (lower(btrim(s.adviser_name)) = 'ma''am imperio' AND lower(last_name) = 'pastores')
            OR (lower(btrim(s.adviser_name)) = 'sir gandia' AND lower(last_name) = 'gandia')
          )
        )
      );
  END LOOP;

  -- ------------------------------------------------------------------------
  -- 4) Sample teacher_assignments: adviser teaches TLE (or Science/English)
  -- ------------------------------------------------------------------------
  FOR r IN
    SELECT
      s.id AS section_id,
      s.grade_level,
      s.track_strand,
      s.adviser_id,
      s.school_year
    FROM public.sections s
    WHERE s.school_year = '2025-2026'
      AND s.grade_level BETWEEN 7 AND 10
      AND s.adviser_id IS NOT NULL
  LOOP
    SELECT sub.id INTO subj_id
    FROM public.subjects sub
    WHERE sub.grade_level = r.grade_level
      AND (
        (r.track_strand IS NOT NULL AND sub.subject_name = 'TLE'
          AND sub.track_strand IS NOT DISTINCT FROM r.track_strand)
        OR (r.track_strand IS NULL AND sub.subject_name = 'Science' AND sub.track_strand IS NULL)
        OR (r.grade_level IN (7, 8) AND sub.subject_name = 'English' AND sub.track_strand IS NULL)
      )
    ORDER BY
      CASE
        WHEN r.track_strand IS NOT NULL AND sub.subject_name = 'TLE'
          AND sub.track_strand IS NOT DISTINCT FROM r.track_strand THEN 0
        WHEN r.track_strand IS NULL AND sub.subject_name = 'Science' THEN 1
        ELSE 2
      END
    LIMIT 1;

    IF subj_id IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.teacher_id = r.adviser_id
        AND ta.section_id = r.section_id
        AND ta.subject_id = subj_id
        AND ta.school_year = r.school_year
    ) THEN
      CONTINUE;
    END IF;

    asg_id := gen_random_uuid();
    INSERT INTO public.teacher_assignments (
      id, teacher_id, section_id, subject_id, school_year
    ) VALUES (
      asg_id, r.adviser_id, r.section_id, subj_id, r.school_year
    );
  END LOOP;

  RAISE NOTICE 'JHS faculty/subjects seed complete for SY 2025-2026.';
END $$;

-- --------------------------------------------------------------------------
-- 5) Verification
-- --------------------------------------------------------------------------
SELECT 'departments_jhs' AS kind, count(*)::text AS value
FROM public.departments WHERE band = 'jhs'
UNION ALL
SELECT 'subjects_g7_10', count(*)::text
FROM public.subjects
WHERE grade_level BETWEEN 7 AND 10
UNION ALL
SELECT 'sections_linked', count(*)::text
FROM public.sections
WHERE school_year = '2025-2026'
  AND grade_level BETWEEN 7 AND 10
  AND adviser_id IS NOT NULL
UNION ALL
SELECT 'sections_unlinked', count(*)::text
FROM public.sections
WHERE school_year = '2025-2026'
  AND grade_level BETWEEN 7 AND 10
  AND adviser_id IS NULL
UNION ALL
SELECT 'assignments', count(*)::text
FROM public.teacher_assignments ta
JOIN public.sections s ON s.id = ta.section_id
WHERE s.school_year = '2025-2026' AND s.grade_level BETWEEN 7 AND 10;

SELECT
  s.grade_level,
  s.section_name,
  s.track_strand,
  s.location,
  s.capacity,
  s.male_count AS male,
  s.female_count AS female,
  s.adviser_name,
  concat_ws(' ', p.first_name, p.last_name) AS linked_teacher,
  t.teacher_id,
  d.name AS department
FROM public.sections s
LEFT JOIN public.teachers t ON t.id = s.adviser_id
LEFT JOIN public.profiles p ON p.id = t.profile_id
LEFT JOIN public.departments d ON d.id = t.department_id
WHERE s.school_year = '2025-2026'
  AND s.grade_level BETWEEN 7 AND 10
ORDER BY s.grade_level, s.section_name
LIMIT 40;
