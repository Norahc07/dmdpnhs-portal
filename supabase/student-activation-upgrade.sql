-- =============================================================================
-- Student activation + personal data + teacher assignments
-- Run in Supabase SQL Editor after base schema
-- =============================================================================

-- Student activation pipeline: incomplete → pending → active
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS activation_status text NOT NULL DEFAULT 'incomplete';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_activation_status_check'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_activation_status_check
      CHECK (activation_status IN ('incomplete', 'pending', 'active'));
  END IF;
END $$;

-- Existing learners already using the portal stay active
UPDATE students
SET activation_status = 'active'
WHERE activation_status = 'incomplete'
  AND profile_id IS NOT NULL
  AND status IN ('enrolled', 'promoted', 'retained', 'remedial');

-- K-12 personal / emergency data
ALTER TABLE students ADD COLUMN IF NOT EXISTS contact_number text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_number text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_access_code_shown text;

-- Parent extras (1 parent per student activation)
ALTER TABLE parents ADD COLUMN IF NOT EXISTS relationship text;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS email text;

-- Teacher ↔ section ↔ subject assignment (registrar assigns; teacher sees roster)
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, section_id, subject_id, school_year)
);

CREATE INDEX IF NOT EXISTS teacher_assignments_teacher_idx
  ON teacher_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS teacher_assignments_section_idx
  ON teacher_assignments (section_id);
CREATE INDEX IF NOT EXISTS students_activation_status_idx
  ON students (activation_status);

-- Allow parent_access_code SMS logging (if trigger_type is constrained, widen it)
DO $$
BEGIN
  -- no-op placeholder; adjust sms_logs.trigger_type CHECK in your base schema if needed
  NULL;
END $$;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_assignments_read" ON teacher_assignments;
CREATE POLICY "teacher_assignments_read" ON teacher_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teacher_assignments_registrar_write" ON teacher_assignments;
CREATE POLICY "teacher_assignments_registrar_write" ON teacher_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'registrar'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'registrar'
    )
  );
