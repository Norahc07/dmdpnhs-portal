-- Grade 12 HUMSS academic-record subjects (Term 1–3)
-- Safe to re-run. Prefer running supabase/shs-term-subjects.sql first for columns.
-- App also matches these names if academic_term is missing.

INSERT INTO public.subjects (
  subject_name,
  grade_level,
  track_strand,
  academic_term,
  subject_kind,
  written_weight,
  performance_weight,
  assessment_weight
)
SELECT
  v.subject_name,
  12,
  'HUMSS',
  v.term,
  v.kind,
  40,
  40,
  20
FROM (
  VALUES
    -- Term 1
    ('Media and Information Literacy', 1, 'minor'),
    ('Earth and Life Science', 1, 'minor'),
    ('Physical Education and Health III', 1, 'minor'),
    ('Practical Research II', 1, 'major'),
    ('Creative Non-Fiction', 1, 'major'),
    ('Trends, Networks, and Critical Thinking in the 21st Century Culture', 1, 'major'),
    -- Term 2
    ('Pagbasa at Pagsusuri ng Iba''t-Ibang Teksto Tungo sa Pananaliksik', 2, 'minor'),
    ('Inquiries, Investigations, and Immersions (3Is)', 2, 'major'),
    ('Introduction to World Religions and Belief Systems', 2, 'major'),
    ('Community Engagement, Solidarity and Citizenship', 2, 'major'),
    ('Work Immersion/Research/Culminating Activity', 2, 'major'),
    -- Term 3
    ('Physical Science', 3, 'minor'),
    ('Contemporary Philippine Arts from the Regions', 3, 'minor'),
    ('Introduction to the Philosophy of the Human Person', 3, 'minor'),
    ('Physical Education and Health IV', 3, 'minor'),
    ('Entrepreneurship', 3, 'minor')
) AS v(subject_name, term, kind)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subjects s
  WHERE s.grade_level = 12
    AND coalesce(s.track_strand, 'HUMSS') = 'HUMSS'
    AND lower(s.subject_name) = lower(v.subject_name)
    AND coalesce(s.academic_term, v.term) = v.term
);

-- Refresh term/kind on existing HUMSS rows (idempotent)
UPDATE public.subjects s
SET
  academic_term = v.term,
  subject_kind = v.kind,
  track_strand = COALESCE(NULLIF(s.track_strand, ''), 'HUMSS')
FROM (
  VALUES
    ('Media and Information Literacy', 1, 'minor'),
    ('Earth and Life Science', 1, 'minor'),
    ('Physical Education and Health III', 1, 'minor'),
    ('Practical Research II', 1, 'major'),
    ('Creative Non-Fiction', 1, 'major'),
    ('Trends, Networks, and Critical Thinking in the 21st Century Culture', 1, 'major'),
    ('Pagbasa at Pagsusuri ng Iba''t-Ibang Teksto Tungo sa Pananaliksik', 2, 'minor'),
    ('Inquiries, Investigations, and Immersions (3Is)', 2, 'major'),
    ('Introduction to World Religions and Belief Systems', 2, 'major'),
    ('Community Engagement, Solidarity and Citizenship', 2, 'major'),
    ('Work Immersion/Research/Culminating Activity', 2, 'major'),
    ('Physical Science', 3, 'minor'),
    ('Contemporary Philippine Arts from the Regions', 3, 'minor'),
    ('Introduction to the Philosophy of the Human Person', 3, 'minor'),
    ('Physical Education and Health IV', 3, 'minor'),
    ('Entrepreneurship', 3, 'minor')
) AS v(subject_name, term, kind)
WHERE s.grade_level = 12
  AND lower(s.subject_name) = lower(v.subject_name)
  AND (
    s.track_strand IS NULL
    OR upper(s.track_strand) LIKE '%HUMSS%'
  );
