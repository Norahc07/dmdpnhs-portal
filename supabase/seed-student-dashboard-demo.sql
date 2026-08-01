-- Demo schedules + calendar events for student dashboard testing
-- Run AFTER student-dashboard-upgrade.sql and seed-step2-sample-users.sql

-- Sample middle name for Juan
UPDATE public.profiles
SET middle_name = 'Santos'
WHERE email = '123456789012@student.dmdpnhs.edu.ph'
  AND (middle_name IS NULL OR middle_name = '');

-- Attach a class schedule for English / Grade 7 Rose if teacher + subject exist
INSERT INTO public.class_schedules (
  subject_id, section_id, teacher_id, day_of_week, start_time, end_time, room
)
SELECT
  s.id,
  sec.id,
  t.id,
  1, -- Monday
  '08:00',
  '09:00',
  'Room 101'
FROM public.subjects s
JOIN public.sections sec ON sec.id = '11111111-1111-1111-1111-111111111111'
CROSS JOIN LATERAL (
  SELECT id FROM public.teachers LIMIT 1
) t
WHERE s.id = '22222222-2222-2222-2222-222222222222'
  AND NOT EXISTS (
    SELECT 1 FROM public.class_schedules cs
    WHERE cs.subject_id = s.id AND cs.section_id = sec.id AND cs.day_of_week = 1
  );

-- Today's events (local calendar date in DB = CURRENT_DATE)
INSERT INTO public.school_events (
  title, event_type, event_date, start_time, end_time, description, grade_level, section_id
)
SELECT * FROM (VALUES
  (
    'English Essay Draft',
    'assignment',
    CURRENT_DATE,
    '09:00'::time,
    NULL::time,
    'Submit draft via class folder.',
    7,
    '11111111-1111-1111-1111-111111111111'::uuid
  ),
  (
    'Science Quiz',
    'exam',
    CURRENT_DATE,
    '10:30'::time,
    '11:15'::time,
    'Chapters 1–2 coverage.',
    7,
    '11111111-1111-1111-1111-111111111111'::uuid
  ),
  (
    'Club Hour',
    'activity',
    CURRENT_DATE,
    '15:00'::time,
    '16:00'::time,
    'Optional co-curricular activity.',
    7,
    NULL::uuid
  ),
  (
    'Flag Ceremony Reminder',
    'school_event',
    CURRENT_DATE,
    '07:00'::time,
    '07:30'::time,
    'Campus-wide assembly.',
    NULL::integer,
    NULL::uuid
  )
) AS v(title, event_type, event_date, start_time, end_time, description, grade_level, section_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_events e
  WHERE e.title = v.title AND e.event_date = v.event_date
);

-- A few events later this month for the full calendar view
INSERT INTO public.school_events (
  title, event_type, event_date, start_time, description, grade_level
)
SELECT * FROM (VALUES
  ('Math Performance Task', 'assignment', (CURRENT_DATE + 3), '14:00'::time, 'Pair work submission.', 7),
  ('Midterm Review Day', 'activity', (CURRENT_DATE + 7), '08:00'::time, 'All Grade 7 sections.', 7),
  ('Parent-Teacher Conference', 'school_event', (CURRENT_DATE + 12), '13:00'::time, 'By appointment.', NULL::integer)
) AS v(title, event_type, event_date, start_time, description, grade_level)
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_events e
  WHERE e.title = v.title AND e.event_date = v.event_date
);
