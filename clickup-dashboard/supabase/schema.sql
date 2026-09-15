-- Time tracking for the ClickUp dashboard.
-- Run this in the Supabase SQL editor once. Creates the table + indexes.

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  task_name text not null,
  task_url text,
  member_id bigint not null,
  member_name text not null,
  member_email text,
  member_pic text,
  project_key text,
  project_name text,
  folder_name text,
  space_name text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists time_entries_member_idx on public.time_entries (member_id);
create index if not exists time_entries_task_idx on public.time_entries (task_id);
create index if not exists time_entries_start_idx on public.time_entries (start_time desc);

alter table public.time_entries enable row level security;
-- v1 uses the dashboard's server-side service role key (bypasses RLS).
-- If you add Supabase Auth + per-user logins later, replace these with
-- auth.uid() = member_id policies.
create policy "service role full access"
  on public.time_entries
  for all
  using (true)
  with check (true);