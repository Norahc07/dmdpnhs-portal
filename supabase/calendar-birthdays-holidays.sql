-- Calendar upgrades: yearly holidays/important events + birthday reminders
-- + registrar-published school events for all portal calendars
-- Run once in Supabase SQL Editor

-- Allow holiday / important types on school_events (optional DB-managed entries)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'school_events'
  ) THEN
    ALTER TABLE public.school_events
      DROP CONSTRAINT IF EXISTS school_events_event_type_check;

    ALTER TABLE public.school_events
      ADD CONSTRAINT school_events_event_type_check
      CHECK (
        event_type IN (
          'assignment',
          'exam',
          'activity',
          'school_event',
          'holiday',
          'important'
        )
      );

    ALTER TABLE public.school_events
      ADD COLUMN IF NOT EXISTS repeats_yearly BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_school_events_repeats_yearly
      ON public.school_events (repeats_yearly)
      WHERE repeats_yearly = true;

    -- Authenticated users can read calendar events
    DROP POLICY IF EXISTS "events_select_authenticated" ON public.school_events;
    CREATE POLICY "events_select_authenticated"
      ON public.school_events FOR SELECT TO authenticated
      USING (true);

    -- Registrar-only write (publish / edit / delete special days)
    DROP POLICY IF EXISTS "events_staff_write" ON public.school_events;
    DROP POLICY IF EXISTS "events_registrar_write" ON public.school_events;
    CREATE POLICY "events_registrar_write"
      ON public.school_events FOR ALL TO authenticated
      USING (public.is_registrar())
      WITH CHECK (public.is_registrar());
  END IF;
END $$;

-- Ensure birthdate columns exist for community birthday calendar
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS birthdate DATE;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS birthdate DATE;
