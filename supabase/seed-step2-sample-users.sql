-- =============================================================================
-- DMDPNHS sample seed (STEP 2) — creates Auth users FIRST, then profiles/data
-- Run in Supabase SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  student_uid uuid := gen_random_uuid();
  parent_uid  uuid := gen_random_uuid();
  section_uid uuid := '11111111-1111-1111-1111-111111111111';
  subject_uid uuid := '22222222-2222-2222-2222-222222222222';
  student_row uuid := gen_random_uuid();
  parent_row  uuid := gen_random_uuid();
BEGIN
  -- --------------------------------------------------------------------------
  -- 1) Auth user: STUDENT
  --    Login: LRN 123456789012 / birthdate 2012-05-15
  --    (password used by portal = 20120515)
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    student_uid,
    'authenticated',
    'authenticated',
    '123456789012@student.dmdpnhs.edu.ph',
    crypt('20120515', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"student","first_name":"Juan","last_name":"Dela Cruz"}'::jsonb,
    NOW(), NOW(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    student_uid,
    jsonb_build_object(
      'sub', student_uid::text,
      'email', '123456789012@student.dmdpnhs.edu.ph',
      'email_verified', true
    ),
    'email',
    student_uid::text,
    NOW(), NOW(), NOW()
  );

  -- --------------------------------------------------------------------------
  -- 2) Auth user: PARENT
  --    Login access code: PAR-DEMO01  (also used as password)
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    parent_uid,
    'authenticated',
    'authenticated',
    'par-demo01@parent.dmdpnhs.edu.ph',
    crypt('PAR-DEMO01', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"parent","first_name":"Maria","last_name":"Dela Cruz"}'::jsonb,
    NOW(), NOW(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    parent_uid,
    jsonb_build_object(
      'sub', parent_uid::text,
      'email', 'par-demo01@parent.dmdpnhs.edu.ph',
      'email_verified', true
    ),
    'email',
    parent_uid::text,
    NOW(), NOW(), NOW()
  );

  -- --------------------------------------------------------------------------
  -- 3) Profiles
  -- --------------------------------------------------------------------------
  INSERT INTO public.profiles (id, role, first_name, last_name, email, status)
  VALUES
    (student_uid, 'student', 'Juan', 'Dela Cruz', '123456789012@student.dmdpnhs.edu.ph', 'active'),
    (parent_uid,  'parent',  'Maria', 'Dela Cruz', 'par-demo01@parent.dmdpnhs.edu.ph', 'active');

  -- --------------------------------------------------------------------------
  -- 4) Section + Subject
  -- --------------------------------------------------------------------------
  INSERT INTO public.sections (id, section_name, grade_level, school_year)
  VALUES (section_uid, 'Rose', 7, '2025-2026')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subjects (
    id, subject_name, grade_level, written_weight, performance_weight, assessment_weight
  )
  VALUES (subject_uid, 'English', 7, 40, 40, 20)
  ON CONFLICT (id) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 5) Student + Parent rows + link
  -- --------------------------------------------------------------------------
  INSERT INTO public.students (
    id, profile_id, lrn, gender, birthdate, grade_level, section_id, status
  )
  VALUES (
    student_row,
    student_uid,
    '123456789012',
    'Male',
    '2012-05-15',
    7,
    section_uid,
    'enrolled'
  );

  INSERT INTO public.parents (id, profile_id, access_code, phone_number)
  VALUES (
    parent_row,
    parent_uid,
    'PAR-DEMO01',
    '09171234567'
  );

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (parent_row, student_row);

  RAISE NOTICE 'Seed OK. Student UID: %, Parent UID: %', student_uid, parent_uid;
END $$;
