-- Batch promotion / re-enrollment staging
-- Apply in Supabase SQL editor (or CLI) before using /registrar/promotion.

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  section_id uuid references public.sections (id) on delete set null,
  school_year text not null,
  grade_level integer not null check (grade_level between 7 and 12),
  status text not null default 'Pending Confirmation'
    check (status in ('Pending Confirmation', 'Officially Enrolled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, school_year)
);

create index if not exists enrollments_section_year_idx
  on public.enrollments (section_id, school_year);

create index if not exists enrollments_status_idx
  on public.enrollments (status);

alter table public.enrollments enable row level security;

drop policy if exists "Registrar manage enrollments" on public.enrollments;
create policy "Registrar manage enrollments"
  on public.enrollments
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'registrar'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'registrar'
    )
  );

drop policy if exists "Students read own enrollments" on public.enrollments;
create policy "Students read own enrollments"
  on public.enrollments
  for select
  using (
    exists (
      select 1 from public.students s
      where s.id = enrollments.student_id and s.profile_id = auth.uid()
    )
  );

comment on table public.enrollments is
  'Next-school-year re-enrollment staging for batch promotion.';
