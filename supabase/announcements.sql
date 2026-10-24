-- Announcements & Updates: teacher posts targeted to one or more sections.
-- Students in those sections see the post and get an unread notification.
-- Run once in the Supabase SQL Editor.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  post_type text not null
    check (post_type in ('announcement', 'reminder', 'assignment', 'update')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_teacher_created_idx
  on public.announcements (teacher_id, created_at desc);

create table if not exists public.announcement_targets (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  primary key (announcement_id, section_id)
);

create index if not exists announcement_targets_section_idx
  on public.announcement_targets (section_id);

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text,
  file_size integer,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists announcement_attachments_post_idx
  on public.announcement_attachments (announcement_id);

create table if not exists public.announcement_notifications (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);

create index if not exists announcement_notifications_student_unread_idx
  on public.announcement_notifications (student_id, created_at desc)
  where read_at is null;

alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_attachments enable row level security;
alter table public.announcement_notifications enable row level security;

-- App writes through the service role; keep authenticated read policies for safety.

drop policy if exists "Teachers read own announcements" on public.announcements;
create policy "Teachers read own announcements"
  on public.announcements for select
  to authenticated
  using (
    author_profile_id = auth.uid()
    or exists (
      select 1
      from public.announcement_targets t
      join public.students s on s.section_id = t.section_id
      where t.announcement_id = announcements.id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "Students read announcement targets" on public.announcement_targets;
create policy "Students read announcement targets"
  on public.announcement_targets for select
  to authenticated
  using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_targets.announcement_id
        and a.author_profile_id = auth.uid()
    )
    or exists (
      select 1 from public.students s
      where s.section_id = announcement_targets.section_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "Read announcement attachments" on public.announcement_attachments;
create policy "Read announcement attachments"
  on public.announcement_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_attachments.announcement_id
        and a.author_profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.announcement_targets t
      join public.students s on s.section_id = t.section_id
      where t.announcement_id = announcement_attachments.announcement_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "Students read own announcement notices" on public.announcement_notifications;
create policy "Students read own announcement notices"
  on public.announcement_notifications for select
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = announcement_notifications.student_id
        and s.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.announcements a
      where a.id = announcement_notifications.announcement_id
        and a.author_profile_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-files',
  'announcement-files',
  true,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "announcement_files_public_read" on storage.objects;
create policy "announcement_files_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'announcement-files');

drop policy if exists "announcement_files_teacher_write" on storage.objects;
create policy "announcement_files_teacher_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'announcement-files');

drop policy if exists "announcement_files_teacher_update" on storage.objects;
create policy "announcement_files_teacher_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'announcement-files')
  with check (bucket_id = 'announcement-files');

drop policy if exists "announcement_files_teacher_delete" on storage.objects;
create policy "announcement_files_teacher_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'announcement-files');
