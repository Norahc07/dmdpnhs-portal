-- Add grade_level to departments (JHS 7–10 / SHS 11–12)
-- Run in Supabase SQL Editor

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS grade_level integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_grade_level_check'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_grade_level_check
      CHECK (
        grade_level IS NULL
        OR grade_level IN (7, 8, 9, 10, 11, 12)
      );
  END IF;
END $$;

-- Replace unique (name, band) with (name, band, grade_level)
ALTER TABLE public.departments
  DROP CONSTRAINT IF EXISTS departments_name_band_key;

DROP INDEX IF EXISTS departments_name_band_key;

CREATE UNIQUE INDEX IF NOT EXISTS departments_name_band_grade_uidx
  ON public.departments (name, band, COALESCE(grade_level, 0));
