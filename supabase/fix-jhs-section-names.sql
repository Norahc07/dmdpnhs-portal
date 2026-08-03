-- Strip "GRADE N -" / "GRADE N " prefixes from JHS section names (SY 2025-2026).
-- Safe for already-seeded data: keeps section IDs, advisers, and enrollments.
-- Example: "GRADE 7 - OPAL" → "OPAL"

UPDATE public.sections
SET section_name = btrim(
  regexp_replace(section_name, '^GRADE\s+[0-9]+\s*-?\s*', '', 'i')
)
WHERE school_year = '2025-2026'
  AND grade_level BETWEEN 7 AND 10
  AND section_name ~* '^GRADE\s+[0-9]+';

-- Verify
SELECT grade_level, section_name
FROM public.sections
WHERE school_year = '2025-2026'
  AND grade_level BETWEEN 7 AND 10
ORDER BY grade_level, section_name
LIMIT 40;
