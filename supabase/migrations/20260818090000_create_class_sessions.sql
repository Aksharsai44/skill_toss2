create table if not exists public.class_sessions (
  id text primary key,
  course_id text not null,
  teacher_id text not null,
  batch_id text not null,
  status text not null check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  jitsi_room_name text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  ended_by text,
  updated_at timestamptz not null default now()
);

alter table public.class_sessions enable row level security;
create policy "Authenticated users can read class sessions" on public.class_sessions
  for select to authenticated using (true);
create policy "Teachers can create class sessions" on public.class_sessions
  for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin', 'super_admin')));
create policy "Teachers can update class sessions" on public.class_sessions
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin', 'super_admin')));
alter publication supabase_realtime add table public.class_sessions;
