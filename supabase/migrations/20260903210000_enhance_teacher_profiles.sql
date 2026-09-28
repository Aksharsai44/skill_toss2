-- Migration: Enhance Teacher Profiles for Real-Time Management
-- Description: Adds extended personal, professional, education, experience, availability, and visibility fields to the teachers table.

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS employee_id text DEFAULT '',
ADD COLUMN IF NOT EXISTS designation text DEFAULT 'Assistant Professor',
ADD COLUMN IF NOT EXISTS department text DEFAULT 'Computer Science',
ADD COLUMN IF NOT EXISTS institution text DEFAULT 'Bright Future College',
ADD COLUMN IF NOT EXISTS dob text DEFAULT '',
ADD COLUMN IF NOT EXISTS gender text DEFAULT '',
ADD COLUMN IF NOT EXISTS address text DEFAULT '',
ADD COLUMN IF NOT EXISTS emergency_contact text DEFAULT '',
ADD COLUMN IF NOT EXISTS joining_date text DEFAULT '',
ADD COLUMN IF NOT EXISTS years_of_experience text DEFAULT '',
ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expertise text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS official_email text DEFAULT '',
ADD COLUMN IF NOT EXISTS office_location text DEFAULT '',
ADD COLUMN IF NOT EXISTS office_hours text DEFAULT '',
ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'all',
ADD COLUMN IF NOT EXISTS profile_completion integer DEFAULT 85,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure RLS is enabled and open for teacher operations
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow read teachers'
  ) THEN
    CREATE POLICY "Allow read teachers" ON public.teachers FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow write teachers'
  ) THEN
    CREATE POLICY "Allow write teachers" ON public.teachers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime publication for teachers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
