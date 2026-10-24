-- Grade 12 HUMSS academic-record subjects (Term 1–3)
-- Safe to re-run. App also matches these names if academic_term is missing.

INSERT INTO public.subjects (subject_name, grade_level, track_strand, written_weight, performance_weight, assessment_weight)
SELECT v.subject_name, 12, 'HUMSS', 40, 40, 20
FROM (
  VALUES
    ('Media and Information Literacy'),
    ('Earth and Life Science'),
    ('Physical Education and Health III'),
    ('Practical Research II'),
    ('Creative Non-Fiction'),
    ('Trends, Networks, and Critical Thinking in the 21st Century Culture'),
    ('Pagbasa at Pagsusuri ng Iba''t-Ibang Teksto Tungo sa Pananaliksik'),
    ('Inquiries, Investigations, and Immersions (3Is)'),
    ('Introduction to World Religions and Belief Systems'),
    ('Community Engagement, Solidarity and Citizenship'),
    ('Work Immersion/Research/Culminating Activity'),
    ('Physical Science'),
    ('Contemporary Philippine Arts from the Regions'),
    ('Introduction to the Philosophy of the Human Person'),
    ('Physical Education and Health IV'),
    ('Entrepreneurship')
) AS v(subject_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subjects s
  WHERE s.grade_level = 12
    AND s.track_strand = 'HUMSS'
    AND lower(s.subject_name) = lower(v.subject_name)
);
