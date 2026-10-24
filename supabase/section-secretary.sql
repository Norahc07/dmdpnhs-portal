-- Class secretary: one student per section, appointed by the class adviser.
-- The secretary may mark daily (homeroom) attendance for that section only.

alter table public.sections
  add column if not exists secretary_student_id uuid
    references public.students (id) on delete set null;

create index if not exists sections_secretary_student_idx
  on public.sections (secretary_student_id);

comment on column public.sections.secretary_student_id is
  'Student appointed by the class adviser to mark section daily attendance.';
