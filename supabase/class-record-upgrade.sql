-- =============================================================================
-- Teacher class records
-- Safe to run on its own: creates teacher_assignments first if it is missing.
-- =============================================================================

-- Keep "extensions" on the path so gen_random_uuid() resolves on Supabase.
SET search_path = public, extensions;

-- Teacher ↔ section ↔ subject assignment (registrar assigns; teacher sees roster)
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, section_id, subject_id, school_year)
);

CREATE INDEX IF NOT EXISTS teacher_assignments_teacher_idx
  ON public.teacher_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS teacher_assignments_section_idx
  ON public.teacher_assignments (section_id);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_assignments_read" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_read" ON public.teacher_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teacher_assignments_registrar_write" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_registrar_write" ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'registrar'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'registrar'
    )
  );

-- One saved class record per teacher assignment + term
-- (term column + UNIQUE(assignment_id, term) added in class-records-term.sql)
CREATE TABLE IF NOT EXISTS public.class_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL
    REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS class_records_assignment_idx
  ON public.class_records (assignment_id);

ALTER TABLE public.class_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_records_teacher_read" ON public.class_records;
CREATE POLICY "class_records_teacher_read" ON public.class_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE ta.id = class_records.assignment_id
        AND t.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'registrar'
    )
  );

DROP POLICY IF EXISTS "class_records_teacher_insert" ON public.class_records;
CREATE POLICY "class_records_teacher_insert" ON public.class_records
  FOR INSERT TO authenticated
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE ta.id = class_records.assignment_id
        AND t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "class_records_teacher_update" ON public.class_records;
CREATE POLICY "class_records_teacher_update" ON public.class_records
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE ta.id = class_records.assignment_id
        AND t.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE ta.id = class_records.assignment_id
        AND t.profile_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_class_record_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_records_updated_at ON public.class_records;
CREATE TRIGGER class_records_updated_at
  BEFORE UPDATE ON public.class_records
  FOR EACH ROW EXECUTE FUNCTION public.set_class_record_updated_at();
