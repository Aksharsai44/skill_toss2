-- Create exams and exam_submissions tables with RLS and Supabase Realtime
create table if not exists public.exams (
  id text primary key,
  title text not null,
  exam_type text default 'internal', -- 'internal', 'quiz', 'mid_semester', 'final', 'assignment_test', 'practice_test'
  course_id text,
  course_title text,
  batch_id text,
  batch_name text,
  subject text,
  teacher_id text,
  teacher_name text,
  date text not null, -- YYYY-MM-DD
  start_time text default '10:00', -- HH:mm
  duration_minutes integer default 60,
  max_marks integer default 50,
  passing_marks integer default 20,
  syllabus text,
  instructions text,
  questions jsonb default '[]'::jsonb,
  attachment_name text,
  status text default 'scheduled', -- 'draft', 'scheduled', 'live', 'completed', 'evaluation_pending', 'results_published'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.exam_submissions (
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  student_id text not null,
  student_name text,
  roll_no text,
  batch_id text,
  answers jsonb default '{}'::jsonb,
  marks integer default 0,
  max_marks integer default 50,
  percentage numeric default 0,
  feedback text,
  status text default 'submitted', -- 'submitted', 'evaluated', 'pending'
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  evaluated_at timestamp with time zone
);

-- Enable RLS
alter table public.exams enable row level security;
alter table public.exam_submissions enable row level security;

-- Policies for public.exams
create policy "Allow read access to exams for authenticated users"
  on public.exams for select using (true);
create policy "Allow insert access to exams for authenticated users"
  on public.exams for insert with check (true);
create policy "Allow update access to exams for authenticated users"
  on public.exams for update using (true);
create policy "Allow delete access to exams for authenticated users"
  on public.exams for delete using (true);

-- Policies for public.exam_submissions
create policy "Allow read access to exam_submissions for authenticated users"
  on public.exam_submissions for select using (true);
create policy "Allow insert access to exam_submissions for authenticated users"
  on public.exam_submissions for insert with check (true);
create policy "Allow update access to exam_submissions for authenticated users"
  on public.exam_submissions for update using (true);
create policy "Allow delete access to exam_submissions for authenticated users"
  on public.exam_submissions for delete using (true);

-- Realtime
alter publication supabase_realtime add table public.exams;
alter publication supabase_realtime add table public.exam_submissions;
