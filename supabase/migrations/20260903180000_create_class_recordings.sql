/*
  # SkillToss LMS Class Recordings Schema Migration

  1. New Tables
     - `class_recordings`
       - `id` (text, PRIMARY KEY)
       - `title` (text, NOT NULL)
       - `course_id` (text)
       - `course_title` (text)
       - `subject` (text)
       - `batch_id` (text, NOT NULL)
       - `batch_name` (text)
       - `teacher_id` (text, NOT NULL)
       - `teacher_name` (text)
       - `class_session_id` (text)
       - `date` (date, NOT NULL DEFAULT CURRENT_DATE)
       - `duration` (text, NOT NULL DEFAULT '00:00')
       - `video_url` (text, NOT NULL)
       - `thumbnail_url` (text)
       - `status` (text, CHECK status IN ('processing', 'ready', 'failed'), DEFAULT 'ready')
       - `views_count` (integer, DEFAULT 0)
       - `created_at` (timestamptz, DEFAULT now())
       - `updated_at` (timestamptz, DEFAULT now())

     - `recording_views`
       - `id` (text, PRIMARY KEY)
       - `recording_id` (text, REFERENCES class_recordings(id) ON DELETE CASCADE)
       - `student_id` (text, NOT NULL)
       - `session_id` (text)
       - `viewed_at` (timestamptz, DEFAULT now())

  2. Security & Realtime
     - Enable RLS on `class_recordings` and `recording_views`
     - Add public/authenticated policies
     - Add `class_recordings` and `recording_views` to `supabase_realtime` publication
*/

-- Class Recordings Table
CREATE TABLE IF NOT EXISTS public.class_recordings (
  id text PRIMARY KEY,
  title text NOT NULL,
  course_id text,
  course_title text,
  subject text,
  batch_id text NOT NULL,
  batch_name text,
  teacher_id text NOT NULL,
  teacher_name text,
  class_session_id text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration text NOT NULL DEFAULT '00:00',
  video_url text NOT NULL,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed')),
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read class_recordings" ON public.class_recordings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write class_recordings" ON public.class_recordings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Recording Views Table
CREATE TABLE IF NOT EXISTS public.recording_views (
  id text PRIMARY KEY,
  recording_id text REFERENCES public.class_recordings(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  session_id text,
  viewed_at timestamptz DEFAULT now()
);

ALTER TABLE public.recording_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read recording_views" ON public.recording_views FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write recording_views" ON public.recording_views FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_recordings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_views;
