-- Required student document uploads + review workflow.
-- Run once in the Supabase SQL Editor.
-- Statuses: submitted → under_review → approved | needs_revision
-- (Not Submitted = no row yet)

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  doc_key text not null,
  file_name text not null,
  file_path text not null,
  file_size integer,
  content_type text,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'needs_revision')),
  reviewer_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, doc_key)
);

create index if not exists student_documents_student_idx
  on public.student_documents (student_id, updated_at desc);

create index if not exists student_documents_status_idx
  on public.student_documents (status, submitted_at desc);

alter table public.student_documents enable row level security;

drop policy if exists "Students read own documents" on public.student_documents;
create policy "Students read own documents"
  on public.student_documents for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_documents.student_id
        and s.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'registrar')
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-documents',
  'student-documents',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
