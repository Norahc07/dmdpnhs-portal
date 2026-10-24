-- Remove seeded SAMPLE / DEMO students from extra grades and sections.
-- Keeps real learners (normal DepEd LRNs). Safe to re-run.
--
-- Demo LRN patterns from seed scripts:
--   111111111111 … 888888888888  walkthrough accounts
--   90000000000x                 pending-activation demo
--   910000000xxx                 roster fillers (Rose, Orchid, Lily, Daisy, …)

-- Preview first (optional):
-- SELECT s.lrn, s.grade_level, sec.section_name, p.first_name, p.last_name
-- FROM public.students s
-- LEFT JOIN public.sections sec ON sec.id = s.section_id
-- LEFT JOIN public.profiles p ON p.id = s.profile_id
-- WHERE s.lrn IN (
--     '111111111111','222222222222','333333333333','444444444444',
--     '555555555555','666666666666','777777777777','888888888888'
--   )
--    OR s.lrn LIKE '90000000000%'
--    OR s.lrn LIKE '910000000%'
-- ORDER BY s.grade_level, sec.section_name, s.lrn;

CREATE TEMP TABLE sample_students AS
SELECT s.id, s.profile_id, s.lrn
FROM public.students s
WHERE s.lrn IN (
    '111111111111','222222222222','333333333333','444444444444',
    '555555555555','666666666666','777777777777','888888888888'
  )
   OR s.lrn LIKE '90000000000%'
   OR s.lrn LIKE '910000000%';

UPDATE public.sections
SET secretary_student_id = NULL
WHERE secretary_student_id IN (SELECT id FROM sample_students);

DELETE FROM public.excuse_letters
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.attendance
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.grades
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.document_requests
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.enrollments
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.evaluations
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.parent_student_links
WHERE student_id IN (SELECT id FROM sample_students);

DELETE FROM public.students
WHERE id IN (SELECT id FROM sample_students);

DELETE FROM public.profiles
WHERE id IN (SELECT profile_id FROM sample_students WHERE profile_id IS NOT NULL)
  AND role = 'student';

-- Auth users (SQL editor as postgres / service role)
DELETE FROM auth.identities
WHERE user_id IN (SELECT profile_id FROM sample_students WHERE profile_id IS NOT NULL);

DELETE FROM auth.users
WHERE id IN (SELECT profile_id FROM sample_students WHERE profile_id IS NOT NULL);

DROP TABLE sample_students;
