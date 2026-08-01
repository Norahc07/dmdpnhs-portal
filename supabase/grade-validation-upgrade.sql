-- =============================================================================
-- Grade validation workflow + faculty departments
-- Run once in Supabase SQL Editor after class-record-upgrade.sql
-- =============================================================================

SET search_path = public, extensions;

-- Departments (e.g. Filipino · Junior High)
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  band text NOT NULL DEFAULT 'jhs'
    CHECK (band IN ('jhs', 'shs', 'all')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, band)
);

-- Faculty: department + position (still profiles.role = teacher)
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS faculty_position text NOT NULL DEFAULT 'teacher';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_faculty_position_check'
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_faculty_position_check
      CHECK (faculty_position IN ('teacher', 'sub_teacher', 'department_head'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS teachers_department_idx ON public.teachers (department_id);

-- Optional: link subjects to a department for clearer routing
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Class record workflow (digital reading committee)
ALTER TABLE public.class_records
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_records_workflow_status_check'
  ) THEN
    ALTER TABLE public.class_records
      ADD CONSTRAINT class_records_workflow_status_check
      CHECK (workflow_status IN (
        'draft',
        'submitted',
        'under_review',
        'returned',
        'endorsed',
        'locked'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS class_records_workflow_idx
  ON public.class_records (workflow_status);

-- Audit trail for grade workflow actions
CREATE TABLE IF NOT EXISTS public.grade_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_record_id uuid REFERENCES public.class_records(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.teacher_assignments(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grade_audit_logs_record_idx
  ON public.grade_audit_logs (class_record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS grade_audit_logs_assignment_idx
  ON public.grade_audit_logs (assignment_id, created_at DESC);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
CREATE POLICY "departments_select_authenticated"
  ON public.departments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "departments_registrar_write" ON public.departments;
CREATE POLICY "departments_registrar_write"
  ON public.departments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'registrar'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'registrar'));

DROP POLICY IF EXISTS "grade_audit_select_staff" ON public.grade_audit_logs;
CREATE POLICY "grade_audit_select_staff"
  ON public.grade_audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('registrar', 'teacher')
    )
  );

DROP POLICY IF EXISTS "grade_audit_insert_staff" ON public.grade_audit_logs;
CREATE POLICY "grade_audit_insert_staff"
  ON public.grade_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('registrar', 'teacher')
    )
  );

-- Allow registrar to update class_records (lock / return / workflow)
DROP POLICY IF EXISTS "class_records_registrar_update" ON public.class_records;
CREATE POLICY "class_records_registrar_update" ON public.class_records
  FOR UPDATE TO authenticated
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

-- Seed starter departments (safe if re-run)
INSERT INTO public.departments (name, band, description) VALUES
  ('Filipino', 'jhs', 'Junior High Filipino teachers'),
  ('English', 'jhs', 'Junior High English teachers'),
  ('Mathematics', 'jhs', 'Junior High Mathematics teachers'),
  ('Science', 'jhs', 'Junior High Science teachers'),
  ('Filipino', 'shs', 'Senior High Filipino / ASSH teachers'),
  ('English', 'shs', 'Senior High English teachers'),
  ('Mathematics', 'shs', 'Senior High Mathematics / STEM teachers'),
  ('Science', 'shs', 'Senior High Science / STEM teachers')
ON CONFLICT (name, band) DO NOTHING;
