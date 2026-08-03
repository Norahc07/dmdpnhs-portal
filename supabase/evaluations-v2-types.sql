-- Re-runnable type expansion (if you already applied an older evaluations-upgrade.sql)
-- Same constraints as evaluations-upgrade.sql

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
