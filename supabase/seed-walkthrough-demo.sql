-- =============================================================================
-- DMDPNHS Portal — Full walkthrough seed
-- Run in Supabase SQL Editor AFTER using the portals.
-- Prerequisites:
--   1) Base schema (profiles, students, teachers, parents, sections, subjects…)
--   2) class-record-upgrade.sql  (creates teacher_assignments + class_records)
--   3) grades-term-upgrade.sql   (school_year + 3-term unique key on grades)
-- Safe to re-run: removes previous walkthrough rows by fixed UUIDs, then reseeds.
-- =============================================================================

-- Supabase installs pgcrypto (crypt / gen_salt) in the "extensions" schema,
-- so it must stay on the search_path for password hashing to resolve.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
SET search_path = public, extensions;

DO $$
DECLARE
  -- Auth / profile UUIDs
  registrar_uid   uuid := 'a0000000-0000-4000-8000-000000000001';
  teacher_uid     uuid := 'a0000000-0000-4000-8000-000000000002';
  pending_t_uid   uuid := 'a0000000-0000-4000-8000-000000000003';
  parent_uid      uuid := 'a0000000-0000-4000-8000-000000000010';
  stu1_uid        uuid := 'a0000000-0000-4000-8000-000000000021'; -- Juan (active)
  stu2_uid        uuid := 'a0000000-0000-4000-8000-000000000022'; -- Pedro (active)
  stu3_uid        uuid := 'a0000000-0000-4000-8000-000000000023'; -- Ana (active)
  stu4_uid        uuid := 'a0000000-0000-4000-8000-000000000024'; -- Maria (active)
  stu5_uid        uuid := 'a0000000-0000-4000-8000-000000000025'; -- Carlo (active)
  stu6_uid        uuid := 'a0000000-0000-4000-8000-000000000026'; -- Sofia (active)
  pending_s_uid   uuid := 'a0000000-0000-4000-8000-000000000027'; -- pending activation
  incomplete_uid  uuid := 'a0000000-0000-4000-8000-000000000028'; -- enrolled, not registered

  -- Domain row UUIDs
  teacher_row     uuid := 'b0000000-0000-4000-8000-000000000002';
  pending_t_row   uuid := 'b0000000-0000-4000-8000-000000000003';
  parent_row      uuid := 'b0000000-0000-4000-8000-000000000010';

  sec_rose        uuid := 'c0000000-0000-4000-8000-000000000001'; -- G7 Rose (advisory)
  sec_lily        uuid := 'c0000000-0000-4000-8000-000000000002'; -- G7 Lily
  sec_orchid      uuid := 'c0000000-0000-4000-8000-000000000003'; -- G8 Orchid
  sec_stem        uuid := 'c0000000-0000-4000-8000-000000000004'; -- G11 STEM ENGINEERING A

  sub_english     uuid := 'd0000000-0000-4000-8000-000000000001';
  sub_math        uuid := 'd0000000-0000-4000-8000-000000000002';
  sub_science     uuid := 'd0000000-0000-4000-8000-000000000003';
  sub_oral        uuid := 'd0000000-0000-4000-8000-000000000004';

  asg_english     uuid := 'e0000000-0000-4000-8000-000000000001';
  asg_math        uuid := 'e0000000-0000-4000-8000-000000000002';
  asg_science     uuid := 'e0000000-0000-4000-8000-000000000003';
  asg_oral        uuid := 'e0000000-0000-4000-8000-000000000004';

  stu1_row        uuid := 'f0000000-0000-4000-8000-000000000001';
  stu2_row        uuid := 'f0000000-0000-4000-8000-000000000002';
  stu3_row        uuid := 'f0000000-0000-4000-8000-000000000003';
  stu4_row        uuid := 'f0000000-0000-4000-8000-000000000004';
  stu5_row        uuid := 'f0000000-0000-4000-8000-000000000005';
  stu6_row        uuid := 'f0000000-0000-4000-8000-000000000006';
  pending_s_row   uuid := 'f0000000-0000-4000-8000-000000000007';
  incomplete_row  uuid := 'f0000000-0000-4000-8000-000000000008';

  class_rec_id    uuid := 'aa000000-0000-4000-8000-000000000001';
  doc_req_id      uuid := 'aa000000-0000-4000-8000-000000000010';

  demo_user_ids uuid[] := ARRAY[
    registrar_uid, teacher_uid, pending_t_uid, parent_uid,
    stu1_uid, stu2_uid, stu3_uid, stu4_uid, stu5_uid, stu6_uid,
    pending_s_uid, incomplete_uid
  ];

  -- Same accounts may already exist under different UUIDs from earlier runs
  demo_emails text[] := ARRAY[
    'registrar@dmdpnhs.edu.ph',
    'teacher.reyes@dmdpnhs.edu.ph',
    'teacher.pending@dmdpnhs.edu.ph',
    'p26-10001@parent.dmdpnhs.edu.ph',
    '111111111111@student.dmdpnhs.edu.ph',
    '222222222222@student.dmdpnhs.edu.ph',
    '333333333333@student.dmdpnhs.edu.ph',
    '444444444444@student.dmdpnhs.edu.ph',
    '555555555555@student.dmdpnhs.edu.ph',
    '666666666666@student.dmdpnhs.edu.ph',
    '777777777777@student.dmdpnhs.edu.ph',
    '888888888888@student.dmdpnhs.edu.ph'
  ];
  demo_lrns text[] := ARRAY[
    '111111111111', '222222222222', '333333333333', '444444444444',
    '555555555555', '666666666666', '777777777777', '888888888888'
  ];

  class_data jsonb;
BEGIN
  -- --------------------------------------------------------------------------
  -- 0) Ensure required tables / columns exist
  -- --------------------------------------------------------------------------
  IF to_regclass('public.teacher_assignments') IS NULL THEN
    RAISE EXCEPTION
      'teacher_assignments missing. Run supabase/class-record-upgrade.sql first.';
  END IF;
  IF to_regclass('public.class_records') IS NULL THEN
    RAISE EXCEPTION
      'class_records missing. Run supabase/class-record-upgrade.sql first.';
  END IF;

  ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS activation_status text NOT NULL DEFAULT 'incomplete';
  ALTER TABLE public.students ADD COLUMN IF NOT EXISTS contact_number text;
  ALTER TABLE public.students ADD COLUMN IF NOT EXISTS personal_email text;
  ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_access_code_shown text;
  ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS relationship text;
  ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS email text;

  -- --------------------------------------------------------------------------
  -- 1) Cleanup previous walkthrough seed
  --    Matches by fixed UUIDs AND by demo email / LRN / access code, so reruns
  --    work even when earlier attempts created rows with different UUIDs.
  -- --------------------------------------------------------------------------
  SELECT demo_user_ids || COALESCE(array_agg(u.id), '{}'::uuid[])
    INTO demo_user_ids
  FROM auth.users u
  WHERE lower(u.email) = ANY (demo_emails);

  IF to_regclass('public.document_requests') IS NOT NULL THEN
    DELETE FROM public.document_requests
    WHERE id = doc_req_id
       OR student_id IN (SELECT id FROM public.students WHERE lrn = ANY (demo_lrns));
  END IF;
  IF to_regclass('public.grades') IS NOT NULL THEN
    DELETE FROM public.grades
    WHERE student_id IN (SELECT id FROM public.students WHERE lrn = ANY (demo_lrns));
  END IF;

  DELETE FROM public.class_records
  WHERE id = class_rec_id
     OR assignment_id IN (asg_english, asg_math, asg_science, asg_oral);

  DELETE FROM public.teacher_assignments
  WHERE id IN (asg_english, asg_math, asg_science, asg_oral)
     OR section_id IN (sec_rose, sec_lily, sec_orchid, sec_stem)
     OR teacher_id IN (
       SELECT id FROM public.teachers WHERE profile_id = ANY (demo_user_ids)
     );

  DELETE FROM public.parent_student_links
  WHERE parent_id IN (
    SELECT id FROM public.parents
    WHERE id = parent_row
       OR access_code = 'P26-10001'
       OR profile_id = ANY (demo_user_ids)
  );

  DELETE FROM public.parents
  WHERE id = parent_row
     OR access_code = 'P26-10001'
     OR profile_id = ANY (demo_user_ids);

  DELETE FROM public.students
  WHERE lrn = ANY (demo_lrns)
     OR profile_id = ANY (demo_user_ids);

  DELETE FROM public.teachers
  WHERE id IN (teacher_row, pending_t_row)
     OR teacher_id IN ('T26-10001', 'T26-10002')
     OR profile_id = ANY (demo_user_ids);

  -- Sections / subjects also have natural-key unique constraints, so clear any
  -- older demo rows that would collide (section_name+grade+SY, subject+grade+strand)
  UPDATE public.sections SET adviser_id = NULL
  WHERE id IN (sec_rose, sec_lily, sec_orchid, sec_stem);

  DELETE FROM public.sections
  WHERE id IN (sec_rose, sec_lily, sec_orchid, sec_stem)
     OR (section_name, grade_level, school_year) IN (
       ('Rose', 7, '2025-2026'),
       ('Lily', 7, '2025-2026'),
       ('Orchid', 8, '2025-2026'),
       ('STEM ENGINEERING A', 11, '2025-2026')
     );

  DELETE FROM public.subjects
  WHERE id IN (sub_english, sub_math, sub_science, sub_oral)
     OR (subject_name = 'English' AND grade_level = 7 AND track_strand IS NULL)
     OR (subject_name = 'Mathematics' AND grade_level = 7 AND track_strand IS NULL)
     OR (subject_name = 'Science' AND grade_level = 8 AND track_strand IS NULL)
     OR (subject_name = 'Oral Communication' AND grade_level = 11
         AND track_strand = 'STEM ENGINEERING');

  DELETE FROM public.profiles
  WHERE id = ANY (demo_user_ids)
     OR lower(email) = ANY (demo_emails);

  DELETE FROM auth.identities WHERE user_id = ANY (demo_user_ids);
  DELETE FROM auth.users WHERE id = ANY (demo_user_ids);

  -- --------------------------------------------------------------------------
  -- Helper: insert auth user + identity
  -- --------------------------------------------------------------------------
  -- Registrar
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    registrar_uid, 'authenticated', 'authenticated',
    'registrar@dmdpnhs.edu.ph',
    crypt('Registrar@2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"registrar","first_name":"School","last_name":"Registrar"}'::jsonb,
    NOW(), NOW(), '', '', '', ''
  );

  -- Teacher (approved / active)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    teacher_uid, 'authenticated', 'authenticated',
    'teacher.reyes@dmdpnhs.edu.ph',
    crypt('Teacher@2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher","first_name":"Ana","last_name":"Reyes"}'::jsonb,
    NOW(), NOW(), '', '', '', ''
  );

  -- Pending teacher (for /registrar/teachers approvals)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    pending_t_uid, 'authenticated', 'authenticated',
    'teacher.pending@dmdpnhs.edu.ph',
    crypt('Pending@2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher","first_name":"Rico","last_name":"Santos"}'::jsonb,
    NOW(), NOW(), '', '', '', ''
  );

  -- Parent
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    parent_uid, 'authenticated', 'authenticated',
    'p26-10001@parent.dmdpnhs.edu.ph',
    crypt('P26-10001', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"parent","first_name":"Rosa","last_name":"Dela Cruz"}'::jsonb,
    NOW(), NOW(), '', '', '', ''
  );

  -- Active students (password = demo123 for all)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', stu1_uid, 'authenticated', 'authenticated',
     '111111111111@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Juan","last_name":"Dela Cruz"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', stu2_uid, 'authenticated', 'authenticated',
     '222222222222@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Pedro","last_name":"Reyes"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', stu3_uid, 'authenticated', 'authenticated',
     '333333333333@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Ana","last_name":"Garcia"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', stu4_uid, 'authenticated', 'authenticated',
     '444444444444@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Maria","last_name":"Lopez"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', stu5_uid, 'authenticated', 'authenticated',
     '555555555555@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Carlo","last_name":"Mendoza"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', stu6_uid, 'authenticated', 'authenticated',
     '666666666666@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Sofia","last_name":"Cruz"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', pending_s_uid, 'authenticated', 'authenticated',
     '777777777777@student.dmdpnhs.edu.ph', crypt('demo123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Luis","last_name":"Torres"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', incomplete_uid, 'authenticated', 'authenticated',
     '888888888888@student.dmdpnhs.edu.ph', crypt('Tmp-demo888!', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"role":"student","first_name":"Liza","last_name":"Navarro"}'::jsonb,
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
  WHERE u.id = ANY (demo_user_ids);

  -- --------------------------------------------------------------------------
  -- 2) Profiles
  -- --------------------------------------------------------------------------
  INSERT INTO public.profiles (id, role, first_name, last_name, email, status) VALUES
    (registrar_uid, 'registrar', 'School', 'Registrar', 'registrar@dmdpnhs.edu.ph', 'active'),
    (teacher_uid,   'teacher',   'Ana',    'Reyes',     'teacher.reyes@dmdpnhs.edu.ph', 'active'),
    (pending_t_uid, 'teacher',   'Rico',   'Santos',    'teacher.pending@dmdpnhs.edu.ph', 'pending'),
    (parent_uid,    'parent',    'Rosa',   'Dela Cruz', 'p26-10001@parent.dmdpnhs.edu.ph', 'active'),
    (stu1_uid, 'student', 'Juan',  'Dela Cruz', '111111111111@student.dmdpnhs.edu.ph', 'active'),
    (stu2_uid, 'student', 'Pedro', 'Reyes',     '222222222222@student.dmdpnhs.edu.ph', 'active'),
    (stu3_uid, 'student', 'Ana',   'Garcia',    '333333333333@student.dmdpnhs.edu.ph', 'active'),
    (stu4_uid, 'student', 'Maria', 'Lopez',     '444444444444@student.dmdpnhs.edu.ph', 'active'),
    (stu5_uid, 'student', 'Carlo', 'Mendoza',   '555555555555@student.dmdpnhs.edu.ph', 'active'),
    (stu6_uid, 'student', 'Sofia', 'Cruz',      '666666666666@student.dmdpnhs.edu.ph', 'active'),
    (pending_s_uid, 'student', 'Luis', 'Torres', '777777777777@student.dmdpnhs.edu.ph', 'pending'),
    (incomplete_uid, 'student', 'Liza', 'Navarro', '888888888888@student.dmdpnhs.edu.ph', 'pending');

  -- --------------------------------------------------------------------------
  -- 3) Teachers
  -- --------------------------------------------------------------------------
  INSERT INTO public.teachers (id, profile_id, teacher_id, faculty_dept, units) VALUES
    (teacher_row,   teacher_uid,   'T26-10001', 'English', 18),
    (pending_t_row, pending_t_uid, 'T26-10002', 'Science', 12);

  -- --------------------------------------------------------------------------
  -- 4) Sections (4 handled; Rose is advisory)
  -- --------------------------------------------------------------------------
  INSERT INTO public.sections (id, section_name, grade_level, school_year, adviser_id) VALUES
    (sec_rose,   'Rose',               7,  '2025-2026', teacher_row),
    (sec_lily,   'Lily',               7,  '2025-2026', NULL),
    (sec_orchid, 'Orchid',             8,  '2025-2026', NULL),
    (sec_stem,   'STEM ENGINEERING A', 11, '2025-2026', NULL);

  -- --------------------------------------------------------------------------
  -- 5) Subjects
  -- --------------------------------------------------------------------------
  INSERT INTO public.subjects (
    id, subject_name, grade_level, track_strand,
    written_weight, performance_weight, assessment_weight
  ) VALUES
    (sub_english, 'English',            7,  NULL,                          40, 40, 20),
    (sub_math,    'Mathematics',        7,  NULL,                          40, 40, 20),
    (sub_science, 'Science',            8,  NULL,                          40, 40, 20),
    (sub_oral,    'Oral Communication', 11, 'STEM ENGINEERING',            25, 50, 25);

  -- --------------------------------------------------------------------------
  -- 6) Teacher assignments (4 sections × subjects)
  -- --------------------------------------------------------------------------
  INSERT INTO public.teacher_assignments (
    id, teacher_id, section_id, subject_id, school_year
  ) VALUES
    (asg_english, teacher_row, sec_rose,   sub_english, '2025-2026'),
    (asg_math,    teacher_row, sec_lily,   sub_math,    '2025-2026'),
    (asg_science, teacher_row, sec_orchid, sub_science, '2025-2026'),
    (asg_oral,    teacher_row, sec_stem,   sub_oral,    '2025-2026');

  -- --------------------------------------------------------------------------
  -- 7) Students
  --    Rose: 6 active (class record demo) + 1 pending activation
  --    Incomplete: enrolled only (no profile) for registrar enroll walkthrough
  -- --------------------------------------------------------------------------
  INSERT INTO public.students (
    id, profile_id, lrn, gender, birthdate, grade_level, section_id,
    status, activation_status, contact_number, personal_email,
    parent_access_code_shown
  ) VALUES
    (stu1_row, stu1_uid, '111111111111', 'Male',   '2012-03-12', 7, sec_rose,
     'enrolled', 'active', '09171110001', 'juan.delacruz@email.com', 'P26-10001'),
    (stu2_row, stu2_uid, '222222222222', 'Male',   '2012-07-21', 7, sec_rose,
     'enrolled', 'active', '09171110002', 'pedro.reyes@email.com', NULL),
    (stu3_row, stu3_uid, '333333333333', 'Female', '2012-01-08', 7, sec_rose,
     'enrolled', 'active', '09171110003', 'ana.garcia@email.com', NULL),
    (stu4_row, stu4_uid, '444444444444', 'Female', '2012-11-30', 7, sec_rose,
     'enrolled', 'active', '09171110004', 'maria.lopez@email.com', NULL),
    (stu5_row, stu5_uid, '555555555555', 'Male',   '2012-05-05', 7, sec_rose,
     'enrolled', 'active', '09171110005', 'carlo.mendoza@email.com', NULL),
    (stu6_row, stu6_uid, '666666666666', 'Female', '2012-09-18', 7, sec_rose,
     'enrolled', 'active', '09171110006', 'sofia.cruz@email.com', NULL),
    (pending_s_row, pending_s_uid, '777777777777', 'Male', '2012-04-02', 7, sec_rose,
     'enrolled', 'pending', '09171110007', 'luis.torres@email.com', 'P26-10007'),
    (incomplete_row, incomplete_uid, '888888888888', 'Female', '2012-06-14', 7, sec_lily,
     'enrolled', 'incomplete', NULL, NULL, NULL);

  -- A few students in other handled sections (for roster / cards)
  -- (reuse active profiles already in Rose only — keep other sections lighter)

  -- --------------------------------------------------------------------------
  -- 8) Parent + link (Juan’s mother)
  -- --------------------------------------------------------------------------
  INSERT INTO public.parents (
    id, profile_id, access_code, phone_number, relationship, email
  ) VALUES (
    parent_row, parent_uid, 'P26-10001', '09181234567', 'Mother', 'rosa.delacruz@email.com'
  );

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (parent_row, stu1_row);

  -- --------------------------------------------------------------------------
  -- 9) Document request (registrar /requests pipeline)
  -- --------------------------------------------------------------------------
  IF to_regclass('public.document_requests') IS NOT NULL THEN
    INSERT INTO public.document_requests (
      id, student_id, document_type, status, requested_at
    ) VALUES (
      doc_req_id, stu1_row, 'Good Moral', 'Pending', NOW()
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- 10) Sample Class Record for English · Grade 7 Rose
  -- --------------------------------------------------------------------------
  class_data := jsonb_build_object(
    'metadata', jsonb_build_object(
      'region', 'IV-A CALABARZON',
      'division', 'Laguna',
      'schoolName', 'Dr. Maria D. Pastrana National High School',
      'schoolId', '301234',
      'schoolYear', '2025-2026',
      'gradeSection', 'Grade 7 - Rose',
      'teacher', 'Ana Reyes',
      'term', '1st Term',
      'subject', 'English',
      'track', 'Core Subject (All Tracks)'
    ),
    'hps', jsonb_build_object(
      'ww', jsonb_build_array(20,20,20,20,20,20,20,20,20,20),
      'pt', jsonb_build_array(25,25,25,25,25,25,25,25,25,25),
      'exams', jsonb_build_object('s1', 50, 's2', 50, 'te', 100)
    ),
    'students', jsonb_build_object(
      stu1_row::text, jsonb_build_object(
        'ww', jsonb_build_array(18,17,19,16,18,20,15,17,19,18),
        'pt', jsonb_build_array(22,23,20,24,21,25,22,23,24,22),
        'exams', jsonb_build_object('s1', 42, 's2', 45, 'te', 88),
        'term1', '90',
        'term2', '88',
        'finalTerm', '91'
      ),
      stu2_row::text, jsonb_build_object(
        'ww', jsonb_build_array(15,14,16,13,15,17,14,15,16,14),
        'pt', jsonb_build_array(18,19,17,20,18,21,19,18,20,17),
        'exams', jsonb_build_object('s1', 35, 's2', 38, 'te', 72),
        'term1', '82',
        'term2', '78',
        'finalTerm', '80'
      ),
      stu3_row::text, jsonb_build_object(
        'ww', jsonb_build_array(19,20,18,19,20,19,18,20,19,20),
        'pt', jsonb_build_array(24,25,23,24,25,24,23,25,24,25),
        'exams', jsonb_build_object('s1', 46, 's2', 48, 'te', 94),
        'term1', '95',
        'term2', '94',
        'finalTerm', '96'
      ),
      stu4_row::text, jsonb_build_object(
        'ww', jsonb_build_array(16,15,17,16,15,18,16,17,15,16),
        'pt', jsonb_build_array(20,21,19,22,20,21,20,22,19,21),
        'exams', jsonb_build_object('s1', 39, 's2', 40, 'te', 78),
        'term1', '85',
        'term2', '83',
        'finalTerm', '84'
      ),
      stu5_row::text, jsonb_build_object(
        'ww', jsonb_build_array(12,11,13,10,12,14,11,12,13,11),
        'pt', jsonb_build_array(15,16,14,17,15,16,15,14,16,15),
        'exams', jsonb_build_object('s1', 28, 's2', 30, 'te', 60),
        'term1', '72',
        'term2', '70',
        'finalTerm', '72'
      ),
      stu6_row::text, jsonb_build_object(
        'ww', jsonb_build_array(17,18,16,17,18,17,16,18,17,18),
        'pt', jsonb_build_array(21,22,20,23,21,22,21,23,20,22),
        'exams', jsonb_build_object('s1', 41, 's2', 43, 'te', 85),
        'term1', '87',
        'term2', '86',
        'finalTerm', '88'
      )
    )
  );

  INSERT INTO public.class_records (id, assignment_id, data, updated_by)
  VALUES (class_rec_id, asg_english, class_data, teacher_uid);

  -- Publish sample term grades so /student/grades and /parent/grades have data
  IF to_regclass('public.grades') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'grades'
         AND column_name = 'school_year'
     )
  THEN
    INSERT INTO public.grades (
      student_id, subject_id, school_year, quarter, final_transmuted_grade
    ) VALUES
      -- English · SY 2025-2026 · 1st / 2nd / Final
      (stu1_row, sub_english, '2025-2026', 1, 90),
      (stu1_row, sub_english, '2025-2026', 2, 88),
      (stu1_row, sub_english, '2025-2026', 3, 91),
      (stu2_row, sub_english, '2025-2026', 1, 82),
      (stu2_row, sub_english, '2025-2026', 2, 78),
      (stu2_row, sub_english, '2025-2026', 3, 80),
      (stu3_row, sub_english, '2025-2026', 1, 95),
      (stu3_row, sub_english, '2025-2026', 2, 94),
      (stu3_row, sub_english, '2025-2026', 3, 96),
      (stu4_row, sub_english, '2025-2026', 1, 85),
      (stu4_row, sub_english, '2025-2026', 2, 83),
      (stu4_row, sub_english, '2025-2026', 3, 84),
      (stu5_row, sub_english, '2025-2026', 1, 72),
      (stu5_row, sub_english, '2025-2026', 2, 70),
      (stu5_row, sub_english, '2025-2026', 3, 72),
      (stu6_row, sub_english, '2025-2026', 1, 87),
      (stu6_row, sub_english, '2025-2026', 2, 86),
      (stu6_row, sub_english, '2025-2026', 3, 88),
      -- Math sample for same learners (Lily section assignment; still visible on portal)
      (stu1_row, sub_math, '2025-2026', 1, 88),
      (stu1_row, sub_math, '2025-2026', 2, 85),
      (stu1_row, sub_math, '2025-2026', 3, 89),
      -- Prior school year so dropdown shows history
      (stu1_row, sub_english, '2024-2025', 1, 86),
      (stu1_row, sub_english, '2024-2025', 2, 84),
      (stu1_row, sub_english, '2024-2025', 3, 87)
    ON CONFLICT (student_id, subject_id, school_year, quarter) DO UPDATE
      SET final_transmuted_grade = EXCLUDED.final_transmuted_grade;
  END IF;

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'DMDPNHS walkthrough seed complete';
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'REGISTRAR  email: registrar@dmdpnhs.edu.ph  / Registrar@2026';
  RAISE NOTICE 'TEACHER    email: teacher.reyes@dmdpnhs.edu.ph / Teacher@2026';
  RAISE NOTICE '           OR Teacher ID: T26-10001 / Teacher@2026';
  RAISE NOTICE 'PARENT     access code: P26-10001';
  RAISE NOTICE 'STUDENT    LRN 111111111111 / demo123  (Juan Dela Cruz)';
  RAISE NOTICE '           LRN 222222222222 / demo123  (Pedro Reyes)';
  RAISE NOTICE '           LRN 333333333333 / demo123  (Ana Garcia)';
  RAISE NOTICE 'PENDING TEACHER (approve at /registrar/teachers):';
  RAISE NOTICE '           teacher.pending@dmdpnhs.edu.ph / Pending@2026';
  RAISE NOTICE 'PENDING STUDENT (approve at /registrar/activations):';
  RAISE NOTICE '           LRN 777777777777 / demo123';
  RAISE NOTICE 'INCOMPLETE STUDENT (Register Account walkthrough):';
  RAISE NOTICE '           LRN 888888888888 — set a new password at /register/student';
  RAISE NOTICE 'Class Record: English · G7 Rose already has sample scores';
  RAISE NOTICE 'Student grades: /student/grades term dropdown (1st/2nd/Final)';
  RAISE NOTICE '============================================================';
END $$;
