-- Create academic_events table for calendar events (classes, exams, assignments, meetings, holidays, etc.)
create table if not exists public.academic_events (
  id text primary key,
  title text not null,
  event_type text not null default 'other', -- 'class', 'exam', 'assignment', 'meeting', 'holiday', 'other'
  course_id text,
  course_title text,
  subject text,
  batch_id text,
  batch_name text,
  teacher_id text,
  teacher_name text,
  date text not null, -- YYYY-MM-DD
  start_time text, -- HH:mm
  end_time text, -- HH:mm
  room_or_link text,
  description text,
  reminder_minutes integer default 15,
  created_by text,
  status text not null default 'scheduled', -- 'scheduled', 'live', 'completed', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.academic_events enable row level security;

-- RLS Policies
create policy "Allow read access to academic_events for authenticated users"
  on public.academic_events for select
  using (true);

create policy "Allow insert access to academic_events for authenticated users"
  on public.academic_events for insert
  with check (true);

create policy "Allow update access to academic_events for authenticated users"
  on public.academic_events for update
  using (true);

create policy "Allow delete access to academic_events for authenticated users"
  on public.academic_events for delete
  using (true);

-- Enable realtime
alter publication supabase_realtime add table public.academic_events;
