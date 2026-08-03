-- Three-Way Evaluation Module (full schema)
-- Student / Teacher / Parent evaluations
-- Run in Supabase SQL Editor

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  school_year text not null,
  term integer not null check (term between 1 and 3),
  evaluator_role text not null check (evaluator_role in ('student', 'teacher', 'parent')),
  evaluator_profile_id uuid not null references public.profiles (id) on delete cascade,
  evaluation_type text not null check (
    evaluation_type in ('system', 'teacher', 'section', 'child')
  ),
  target_teacher_id uuid references public.teachers (id) on delete set null,
  target_subject_id uuid references public.subjects (id) on delete set null,
  target_section_id uuid references public.sections (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  parent_id uuid references public.parents (id) on delete set null,
  scores jsonb not null default '{}'::jsonb,
  average_score numeric(4, 2),
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path when table already exists with older type check
alter table public.evaluations drop constraint if exists evaluations_teacher_target_chk;
alter table public.evaluations drop constraint if exists evaluations_target_chk;
alter table public.evaluations drop constraint if exists evaluations_evaluation_type_check;

alter table public.evaluations
  add constraint evaluations_evaluation_type_check
  check (evaluation_type in ('system', 'teacher', 'section', 'child'));

alter table public.evaluations
  add constraint evaluations_target_chk check (
    (
      evaluation_type = 'system'
      and target_teacher_id is null
    )
    or (
      evaluation_type = 'teacher'
      and target_teacher_id is not null
    )
    or (
      evaluation_type = 'section'
      and target_section_id is not null
    )
    or (
      evaluation_type = 'child'
      and student_id is not null
    )
  );

create unique index if not exists evaluations_system_unique_idx
  on public.evaluations (evaluator_profile_id, school_year, term, evaluation_type)
  where evaluation_type = 'system';

create unique index if not exists evaluations_teacher_unique_idx
  on public.evaluations (
    evaluator_profile_id,
    school_year,
    term,
    target_teacher_id,
    target_subject_id
  )
  where evaluation_type = 'teacher';

create unique index if not exists evaluations_section_unique_idx
  on public.evaluations (
    evaluator_profile_id,
    school_year,
    term,
    target_section_id
  )
  where evaluation_type = 'section';

create unique index if not exists evaluations_child_unique_idx
  on public.evaluations (
    evaluator_profile_id,
    school_year,
    term,
    student_id
  )
  where evaluation_type = 'child';

create index if not exists evaluations_term_idx
  on public.evaluations (school_year, term, evaluation_type);

alter table public.evaluations enable row level security;

drop policy if exists "Evaluators insert own evaluations" on public.evaluations;
create policy "Evaluators insert own evaluations"
  on public.evaluations for insert
  with check (evaluator_profile_id = auth.uid());

drop policy if exists "Evaluators update own evaluations" on public.evaluations;
create policy "Evaluators update own evaluations"
  on public.evaluations for update
  using (evaluator_profile_id = auth.uid())
  with check (evaluator_profile_id = auth.uid());

drop policy if exists "Evaluators read own evaluations" on public.evaluations;
create policy "Evaluators read own evaluations"
  on public.evaluations for select
  using (
    evaluator_profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'registrar'
    )
  );

comment on table public.evaluations is
  'Three-way evaluation: system, student→teachers (per term), teacher→sections (year-end), parent→child.';
