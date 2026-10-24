-- Student self-assessment + teacher → learner evaluation types.
-- Run after evaluations-upgrade.sql (and evaluations-v2-types.sql if used).

alter table public.evaluations drop constraint if exists evaluations_target_chk;
alter table public.evaluations drop constraint if exists evaluations_evaluation_type_check;

alter table public.evaluations
  add constraint evaluations_evaluation_type_check
    check (evaluation_type in ('system', 'teacher', 'section', 'child', 'self', 'student'));

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
    or (
      evaluation_type = 'self'
      and student_id is not null
    )
    or (
      evaluation_type = 'student'
      and student_id is not null
    )
  );

create unique index if not exists evaluations_self_unique_idx
  on public.evaluations (
    evaluator_profile_id,
    school_year,
    term
  )
  where evaluation_type = 'self';

create unique index if not exists evaluations_student_target_unique_idx
  on public.evaluations (
    evaluator_profile_id,
    school_year,
    term,
    student_id
  )
  where evaluation_type = 'student';
