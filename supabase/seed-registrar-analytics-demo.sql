-- =============================================================================
-- Registrar analytics demo seed
-- Populates document_requests + sample grades so charts use live DB rows.
-- Safe to re-run: removes prior rows tagged by analytics-demo notes / markers.
-- Prerequisites: sections for SY 2025-2026, at least 1 student, 1 subject.
-- =============================================================================

SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 0) Ensure document_type check allows portal values (SF9 / SF10 / Good Moral)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.document_requests') IS NULL THEN
    RETURN;
  END IF;

  -- Drop first so remaps to SF9/SF10 are allowed under the old constraint
  ALTER TABLE public.document_requests
    DROP CONSTRAINT IF EXISTS document_requests_document_type_check;

  UPDATE public.document_requests
  SET document_type = 'SF10'
  WHERE document_type IN ('Form 137', 'SF 10', 'Permanent Record');

  UPDATE public.document_requests
  SET document_type = 'SF9'
  WHERE document_type IN ('Form 138', 'SF 9', 'Report Card');

  UPDATE public.document_requests
  SET document_type = 'Good Moral'
  WHERE document_type IN (
    'Good Moral Certificate',
    'Certificate of Good Moral Character',
    'Certificate of Good Moral'
  );

  UPDATE public.document_requests
  SET document_type = 'Good Moral'
  WHERE document_type NOT IN ('SF9', 'SF10', 'Good Moral');

  ALTER TABLE public.document_requests
    ADD CONSTRAINT document_requests_document_type_check
    CHECK (document_type IN ('SF9', 'SF10', 'Good Moral'));
END $$;

-- --------------------------------------------------------------------------
-- 1) Document request pipeline samples (SF9 / SF10 / Good Moral × statuses)
-- --------------------------------------------------------------------------
DELETE FROM public.document_requests
WHERE notes = 'analytics-demo'
   OR (document_type IN ('SF9', 'SF10', 'Good Moral')
       AND requested_at >= '2025-06-01'
       AND notes IS NULL
       AND EXISTS (
         SELECT 1 FROM public.students s
         WHERE s.id = document_requests.student_id
           AND s.lrn LIKE 'DEMO-ANALYTICS%'
       ));

DO $$
DECLARE
  sid uuid;
  i int;
  types text[] := ARRAY['SF9', 'SF10', 'Good Moral', 'SF9', 'SF10', 'Good Moral',
                        'SF9', 'Good Moral', 'SF10', 'SF9', 'Good Moral', 'SF9',
                        'SF10', 'Good Moral', 'SF9', 'SF10', 'Good Moral', 'SF9'];
  statuses text[] := ARRAY[
    'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending',
    'Pending', 'Pending', 'Pending', 'Pending',
    'Ready for Pickup', 'Ready for Pickup', 'Ready for Pickup',
    'Ready for Pickup', 'Ready for Pickup', 'Ready for Pickup',
    'Ready for Pickup', 'Ready for Pickup'
  ];
BEGIN
  SELECT id INTO sid FROM public.students ORDER BY created_at NULLS LAST LIMIT 1;
  IF sid IS NULL THEN
    RAISE NOTICE 'No students found — skip document_requests demo seed.';
    RETURN;
  END IF;

  IF to_regclass('public.document_requests') IS NULL THEN
    RAISE NOTICE 'document_requests table missing — skip.';
    RETURN;
  END IF;

  FOR i IN 1 .. array_length(types, 1) LOOP
    INSERT INTO public.document_requests (
      student_id, document_type, status, requested_at, notes
    ) VALUES (
      sid,
      types[i],
      statuses[i],
      NOW() - ((i % 14) || ' days')::interval,
      'analytics-demo'
    );
  END LOOP;
END $$;

-- --------------------------------------------------------------------------
-- 2) Sample final grades across DepEd bands (for histogram)
-- Adds school_year if missing (lightweight), then seeds scores.
-- Full upgrade remains: supabase/grades-term-upgrade.sql
-- --------------------------------------------------------------------------
DO $$
DECLARE
  subj uuid;
  band_scores int[] := ARRAY[
    96, 93, 91, 90, 88, 87, 86, 85, 84, 83, 82, 81, 80,
    79, 78, 77, 76, 75, 72, 68, 94, 89, 81, 77, 71
  ];
  stu record;
  idx int := 1;
  has_school_year boolean := false;
BEGIN
  IF to_regclass('public.grades') IS NULL THEN
    RAISE NOTICE 'grades table missing — skip.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grades'
      AND column_name = 'school_year'
  ) INTO has_school_year;

  IF NOT has_school_year THEN
    ALTER TABLE public.grades
      ADD COLUMN school_year text DEFAULT '2025-2026';

    UPDATE public.grades
    SET school_year = '2025-2026'
    WHERE school_year IS NULL OR btrim(school_year) = '';

    ALTER TABLE public.grades
      ALTER COLUMN school_year SET DEFAULT '2025-2026';

    ALTER TABLE public.grades
      ALTER COLUMN school_year SET NOT NULL;

    -- Prefer year-aware unique key when possible
    BEGIN
      ALTER TABLE public.grades
        DROP CONSTRAINT IF EXISTS grades_student_id_subject_id_quarter_key;
      ALTER TABLE public.grades
        DROP CONSTRAINT IF EXISTS grades_student_subject_year_term_key;
      ALTER TABLE public.grades
        ADD CONSTRAINT grades_student_subject_year_term_key
        UNIQUE (student_id, subject_id, school_year, quarter);
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Could not recreate grades unique key: %', SQLERRM;
    END;

    has_school_year := true;
  END IF;

  SELECT id INTO subj FROM public.subjects LIMIT 1;
  IF subj IS NULL THEN
    RAISE NOTICE 'No subjects found — skip grades demo seed.';
    RETURN;
  END IF;

  FOR stu IN
    SELECT id FROM public.students
    ORDER BY id
    LIMIT 25
  LOOP
    BEGIN
      INSERT INTO public.grades (
        student_id, subject_id, school_year, quarter, final_transmuted_grade
      ) VALUES (
        stu.id, subj, '2025-2026', 3, band_scores[idx]
      )
      ON CONFLICT (student_id, subject_id, school_year, quarter)
      DO UPDATE SET final_transmuted_grade = EXCLUDED.final_transmuted_grade;
    EXCEPTION
      WHEN others THEN
        -- No matching unique constraint — plain insert / update
        BEGIN
          INSERT INTO public.grades (
            student_id, subject_id, school_year, quarter, final_transmuted_grade
          ) VALUES (
            stu.id, subj, '2025-2026', 3, band_scores[idx]
          );
        EXCEPTION
          WHEN unique_violation THEN
            UPDATE public.grades
            SET final_transmuted_grade = band_scores[idx]
            WHERE student_id = stu.id
              AND subject_id = subj
              AND school_year = '2025-2026'
              AND quarter = 3;
        END;
    END;

    idx := idx + 1;
    IF idx > array_length(band_scores, 1) THEN
      idx := 1;
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------------------------------
-- 3) Ops queue demos: pending faculty, pending activations, locked gradebooks
-- --------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
SET search_path = public, extensions;

DO $$
DECLARE
  -- Pending faculty (3)
  pf1 uuid := 'a0a10000-0000-4000-8000-000000000001';
  pf2 uuid := 'a0a10000-0000-4000-8000-000000000002';
  pf3 uuid := 'a0a10000-0000-4000-8000-000000000003';
  tr1 uuid := 'b0b10000-0000-4000-8000-000000000001';
  tr2 uuid := 'b0b10000-0000-4000-8000-000000000002';
  tr3 uuid := 'b0b10000-0000-4000-8000-000000000003';

  -- Pending activation students (5)
  ps1 uuid := 'a0a20000-0000-4000-8000-000000000001';
  ps2 uuid := 'a0a20000-0000-4000-8000-000000000002';
  ps3 uuid := 'a0a20000-0000-4000-8000-000000000003';
  ps4 uuid := 'a0a20000-0000-4000-8000-000000000004';
  ps5 uuid := 'a0a20000-0000-4000-8000-000000000005';
  sr1 uuid := 'f0f20000-0000-4000-8000-000000000001';
  sr2 uuid := 'f0f20000-0000-4000-8000-000000000002';
  sr3 uuid := 'f0f20000-0000-4000-8000-000000000003';
  sr4 uuid := 'f0f20000-0000-4000-8000-000000000004';
  sr5 uuid := 'f0f20000-0000-4000-8000-000000000005';

  sec_id uuid;
  subj_id uuid;
  teacher_id_row uuid;
  asg_id uuid;
  i int;
  demo_emails text[] := ARRAY[
    'teacher.pending.analytics1@dmdpnhs.edu.ph',
    'teacher.pending.analytics2@dmdpnhs.edu.ph',
    'teacher.pending.analytics3@dmdpnhs.edu.ph',
    '900000000001@student.dmdpnhs.edu.ph',
    '900000000002@student.dmdpnhs.edu.ph',
    '900000000003@student.dmdpnhs.edu.ph',
    '900000000004@student.dmdpnhs.edu.ph',
    '900000000005@student.dmdpnhs.edu.ph'
  ];
  demo_uids uuid[] := ARRAY[pf1, pf2, pf3, ps1, ps2, ps3, ps4, ps5];
BEGIN
  -- Clean prior analytics-demo auth/profile rows by email / LRN
  DELETE FROM public.document_requests
  WHERE student_id IN (SELECT id FROM public.students WHERE lrn LIKE '90000000000%');
  DELETE FROM public.students
  WHERE id = ANY (ARRAY[sr1, sr2, sr3, sr4, sr5])
     OR lrn LIKE '90000000000%';
  DELETE FROM public.teacher_assignments
  WHERE teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = ANY (ARRAY[pf1, pf2, pf3]));
  DELETE FROM public.teachers WHERE profile_id = ANY (ARRAY[pf1, pf2, pf3]);
  DELETE FROM auth.identities
  WHERE user_id IN (SELECT id FROM auth.users WHERE email = ANY (demo_emails));
  DELETE FROM public.profiles WHERE id = ANY (demo_uids) OR email = ANY (demo_emails);
  DELETE FROM auth.users WHERE id = ANY (demo_uids) OR email = ANY (demo_emails);

  -- Auth users (password Teacher@2026 / demo123)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', pf1, 'authenticated', 'authenticated',
     demo_emails[1], crypt('Teacher@2026', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"teacher","first_name":"Marco","last_name":"Villanueva"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', pf2, 'authenticated', 'authenticated',
     demo_emails[2], crypt('Teacher@2026', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"teacher","first_name":"Liza","last_name":"Domingo"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', pf3, 'authenticated', 'authenticated',
     demo_emails[3], crypt('Teacher@2026', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"teacher","first_name":"Paolo","last_name":"Salazar"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', ps1, 'authenticated', 'authenticated',
     demo_emails[4], crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Kyle","last_name":"Ramirez"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', ps2, 'authenticated', 'authenticated',
     demo_emails[5], crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Mia","last_name":"Santos"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', ps3, 'authenticated', 'authenticated',
     demo_emails[6], crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Noah","last_name":"Cruz"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', ps4, 'authenticated', 'authenticated',
     demo_emails[7], crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Ella","last_name":"Bautista"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', ps5, 'authenticated', 'authenticated',
     demo_emails[8], crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Jared","last_name":"Lim"}'::jsonb,
     NOW(), NOW(), '', '', '', '');

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
    'email',
    u.id::text,
    NOW(), NOW(), NOW()
  FROM auth.users u
  WHERE u.id = ANY (demo_uids);

  -- Pending faculty profiles + teacher rows
  INSERT INTO public.profiles (id, role, first_name, last_name, email, status) VALUES
    (pf1, 'teacher', 'Marco', 'Villanueva', demo_emails[1], 'pending'),
    (pf2, 'teacher', 'Liza',  'Domingo',    demo_emails[2], 'pending'),
    (pf3, 'teacher', 'Paolo', 'Salazar',    demo_emails[3], 'pending');

  INSERT INTO public.teachers (id, profile_id, teacher_id, faculty_dept, units) VALUES
    (tr1, pf1, 'T26-38417', 'English', 18),
    (tr2, pf2, 'T26-59102', 'Science', 18),
    (tr3, pf3, 'T26-74628', 'Math', 18)
  ON CONFLICT (id) DO NOTHING;

  -- Pending activation students
  SELECT id INTO sec_id
  FROM public.sections
  WHERE school_year = '2025-2026'
  ORDER BY grade_level, section_name
  LIMIT 1;

  INSERT INTO public.profiles (id, role, first_name, last_name, email, status) VALUES
    (ps1, 'student', 'Kyle',  'Ramirez',  demo_emails[4], 'pending'),
    (ps2, 'student', 'Mia',   'Santos',   demo_emails[5], 'pending'),
    (ps3, 'student', 'Noah',  'Cruz',     demo_emails[6], 'pending'),
    (ps4, 'student', 'Ella',  'Bautista', demo_emails[7], 'pending'),
    (ps5, 'student', 'Jared', 'Lim',      demo_emails[8], 'pending');

  INSERT INTO public.students (
    id, profile_id, lrn, gender, birthdate, grade_level, section_id,
    status, activation_status, contact_number, personal_email,
    parent_access_code_shown
  ) VALUES
    (sr1, ps1, '900000000001', 'Male',   '2012-02-11', 7, sec_id,
     'enrolled', 'pending', '09190000001', 'kyle.ramirez@email.com', 'P26-48173'),
    (sr2, ps2, '900000000002', 'Female', '2012-05-19', 7, sec_id,
     'enrolled', 'pending', '09190000002', 'mia.santos@email.com', 'P26-90258'),
    (sr3, ps3, '900000000003', 'Male',   '2011-08-03', 8, sec_id,
     'enrolled', 'pending', '09190000003', 'noah.cruz@email.com', 'P26-13640'),
    (sr4, ps4, '900000000004', 'Female', '2011-11-22', 8, sec_id,
     'enrolled', 'pending', '09190000004', 'ella.bautista@email.com', 'P26-75419'),
    (sr5, ps5, '900000000005', 'Male',   '2010-04-07', 9, sec_id,
     'enrolled', 'pending', '09190000005', 'jared.lim@email.com', 'P26-62805');

  -- Locked gradebooks: ensure workflow column, then lock existing or create demo records
  IF to_regclass('public.class_records') IS NOT NULL THEN
    ALTER TABLE public.class_records
      ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS locked_at timestamptz;

    UPDATE public.class_records
    SET workflow_status = 'locked',
        locked_at = COALESCE(locked_at, NOW())
    WHERE id IN (
      SELECT cr.id
      FROM public.class_records cr
      WHERE COALESCE(cr.workflow_status, 'draft') IS DISTINCT FROM 'locked'
      ORDER BY cr.updated_at DESC NULLS LAST
      LIMIT 4
    );

    IF (
      SELECT COUNT(*) FROM public.class_records WHERE workflow_status = 'locked'
    ) < 4
      AND to_regclass('public.teacher_assignments') IS NOT NULL
    THEN
      SELECT id INTO teacher_id_row FROM public.teachers LIMIT 1;

      IF teacher_id_row IS NOT NULL THEN
        FOR i IN 0..3 LOOP
          SELECT s.id INTO subj_id
          FROM public.subjects s
          ORDER BY s.id
          OFFSET i LIMIT 1;

          SELECT sec.id INTO sec_id
          FROM public.sections sec
          WHERE sec.school_year = '2025-2026'
          ORDER BY sec.grade_level, sec.section_name
          OFFSET i LIMIT 1;

          IF subj_id IS NULL OR sec_id IS NULL THEN
            CONTINUE;
          END IF;

          SELECT ta.id INTO asg_id
          FROM public.teacher_assignments ta
          WHERE ta.teacher_id = teacher_id_row
            AND ta.section_id = sec_id
            AND ta.subject_id = subj_id
            AND ta.school_year = '2025-2026'
          LIMIT 1;

          IF asg_id IS NULL THEN
            asg_id := gen_random_uuid();
            BEGIN
              INSERT INTO public.teacher_assignments (
                id, teacher_id, section_id, subject_id, school_year
              ) VALUES (
                asg_id, teacher_id_row, sec_id, subj_id, '2025-2026'
              );
            EXCEPTION
              WHEN unique_violation THEN
                SELECT ta.id INTO asg_id
                FROM public.teacher_assignments ta
                WHERE ta.teacher_id = teacher_id_row
                  AND ta.section_id = sec_id
                  AND ta.subject_id = subj_id
                  AND ta.school_year = '2025-2026'
                LIMIT 1;
            END;
          END IF;

          IF asg_id IS NULL THEN
            CONTINUE;
          END IF;

          INSERT INTO public.class_records (
            id, assignment_id, data, workflow_status, locked_at, updated_by
          ) VALUES (
            gen_random_uuid(),
            asg_id,
            jsonb_build_object(
              'metadata', jsonb_build_object(
                'schoolYear', '2025-2026',
                'term', 'Final',
                'note', 'analytics-demo-locked'
              )
            ),
            'locked',
            NOW(),
            pf1
          )
          ON CONFLICT (assignment_id) DO UPDATE
          SET workflow_status = 'locked',
              locked_at = NOW(),
              data = EXCLUDED.data;
        END LOOP;
      END IF;
    END IF;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 4) Light EOSY status samples on non-active / incomplete learners only
-- (avoids locking out currently logged-in demo students)
-- --------------------------------------------------------------------------
UPDATE public.students
SET status = 'promoted'
WHERE activation_status IS DISTINCT FROM 'active'
  AND status = 'enrolled'
  AND id IN (
    SELECT id FROM public.students
    WHERE activation_status IS DISTINCT FROM 'active'
      AND lrn NOT LIKE '90000000000%'
    ORDER BY id
    LIMIT 3
  );

UPDATE public.students
SET status = 'retained'
WHERE id IN (
  SELECT id FROM public.students
  WHERE status NOT IN ('retained', 'remedial', 'promoted')
    AND activation_status IS DISTINCT FROM 'active'
    AND lrn NOT LIKE '90000000000%'
  ORDER BY id
  OFFSET 3
  LIMIT 1
);

UPDATE public.students
SET status = 'remedial'
WHERE id IN (
  SELECT id FROM public.students
  WHERE status NOT IN ('retained', 'remedial', 'promoted')
    AND activation_status IS DISTINCT FROM 'active'
    AND lrn NOT LIKE '90000000000%'
  ORDER BY id
  OFFSET 4
  LIMIT 1
);

-- --------------------------------------------------------------------------
-- 5) Quick verify
-- --------------------------------------------------------------------------
SELECT 'sections_headcount' AS metric,
       COALESCE(SUM(COALESCE(male_count,0) + COALESCE(female_count,0)), 0) AS value
FROM public.sections
WHERE school_year = '2025-2026'
UNION ALL
SELECT 'document_demo_rows', COUNT(*)::bigint
FROM public.document_requests
WHERE notes = 'analytics-demo'
UNION ALL
SELECT 'grades_rows', COUNT(*)::bigint
FROM public.grades
UNION ALL
SELECT 'pending_faculty', COUNT(*)::bigint
FROM public.profiles
WHERE role = 'teacher' AND status = 'pending'
UNION ALL
SELECT 'pending_activations', COUNT(*)::bigint
FROM public.students
WHERE activation_status = 'pending'
UNION ALL
SELECT 'locked_gradebooks', COUNT(*)::bigint
FROM public.class_records
WHERE workflow_status = 'locked';
