-- Teacher-added class/school events on the portal calendar.
-- Official DepEd dates stay in application code and are never stored here.
-- Run once in the Supabase SQL editor.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'school_events'
  ) THEN
    ALTER TABLE public.school_events
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_school_events_section
      ON public.school_events (section_id);

    CREATE INDEX IF NOT EXISTS idx_school_events_created_by
      ON public.school_events (created_by);
  END IF;
END $$;
