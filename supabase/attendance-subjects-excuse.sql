-- Attendance: per-subject periods + excused status + excuse letters
-- Run in Supabase SQL Editor after existing attendance table exists.

-- 1) Allow subject-linked rows and excused status
alter table public.attendance
  add column if not exists subject_id uuid references public.subjects (id) on delete set null;

alter table public.attendance
  add column if not exists notes text;

-- Drop old status check if present, then re-add with excused
alter table public.attendance drop constraint if exists attendance_status_check;

alter table public.attendance
  add constraint attendance_status_check
  check (status in ('present', 'absent', 'late', 'excused'));

-- Replace unique (student_id, date) so multiple subjects per day are allowed
alter table public.attendance drop constraint if exists attendance_student_id_date_key;
alter table public.attendance drop constraint if exists attendance_student_date_unique;

drop index if exists attendance_student_date_unique_idx;
drop index if exists attendance_student_date_subject_unique_idx;
drop index if exists attendance_student_date_homeroom_unique_idx;

-- Homeroom / legacy rows (no subject)
-- Partial indexes are correct for data integrity, but PostgREST upsert
-- ON CONFLICT cannot target them — the app uses select→update/insert instead.
create unique index if not exists attendance_student_date_homeroom_unique_idx
  on public.attendance (student_id, date)
  where subject_id is null;

-- Subject period rows
create unique index if not exists attendance_student_date_subject_unique_idx
  on public.attendance (student_id, date, subject_id)
  where subject_id is not null;

create index if not exists attendance_subject_date_idx
  on public.attendance (section_id, date, subject_id);

-- 2) Excuse letters
create table if not exists public.excuse_letters (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  reason_type text not null check (reason_type in ('Illness', 'Emergency', 'Calamity')),
  explanation text not null,
  file_path text,
  file_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists excuse_letters_attendance_unique_idx
  on public.excuse_letters (attendance_id);

create index if not exists excuse_letters_student_idx
  on public.excuse_letters (student_id, status);

alter table public.excuse_letters enable row level security;

drop policy if exists "Students manage own excuse letters" on public.excuse_letters;
create policy "Students manage own excuse letters"
  on public.excuse_letters for all
  using (
    exists (
      select 1 from public.students s
      where s.id = excuse_letters.student_id
        and s.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = excuse_letters.student_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "Teachers and registrar read excuse letters" on public.excuse_letters;
create policy "Teachers and registrar read excuse letters"
  on public.excuse_letters for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'registrar')
    )
  );

drop policy if exists "Teachers and registrar update excuse letters" on public.excuse_letters;
create policy "Teachers and registrar update excuse letters"
  on public.excuse_letters for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'registrar')
    )
  );

-- Optional storage bucket for excuse attachments (create via Dashboard if missing):
-- Bucket name: excuse-letters (private)
comment on table public.excuse_letters is
  'Student-submitted excuse letters for absent periods; teacher/registrar can approve to mark excused.';
