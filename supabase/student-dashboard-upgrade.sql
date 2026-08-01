-- Optional schema upgrades for Student Dashboard
-- Run in Supabase SQL Editor once

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Class offerings / subject assignments for a section
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_section ON public.class_schedules(section_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_day ON public.class_schedules(day_of_week);

-- School calendar events (assignments, exams, activities, events)
CREATE TABLE IF NOT EXISTS public.school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('assignment', 'exam', 'activity', 'school_event')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  description TEXT,
  grade_level INTEGER CHECK (grade_level IS NULL OR grade_level BETWEEN 7 AND 12),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_events_date ON public.school_events(event_date);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select_authenticated" ON public.class_schedules;
CREATE POLICY "schedules_select_authenticated"
  ON public.class_schedules FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "schedules_registrar_write" ON public.class_schedules;
CREATE POLICY "schedules_registrar_write"
  ON public.class_schedules FOR ALL TO authenticated
  USING (public.is_registrar() OR public.is_teacher())
  WITH CHECK (public.is_registrar() OR public.is_teacher());

DROP POLICY IF EXISTS "events_select_authenticated" ON public.school_events;
CREATE POLICY "events_select_authenticated"
  ON public.school_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "events_staff_write" ON public.school_events;
CREATE POLICY "events_staff_write"
  ON public.school_events FOR ALL TO authenticated
  USING (public.is_registrar() OR public.is_teacher())
  WITH CHECK (public.is_registrar() OR public.is_teacher());
