/*
  # SkillToss Course Management Platform Schema Migration

  1. Updated / New Tables:
     - `courses`: Enhanced course table supporting status workflow (DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, APPROVED, PUBLISHED, REJECTED), admin feedback, learning objectives, prerequisites, skills gained, and versioning.
     - `course_modules`: Curriculum modules / sections.
     - `course_lessons`: Video, PDF, DOC, PPT, Text, External Link, Coding Exercise, Quiz, and Assignment lessons.
     - `course_enrollments`: Tracks student course enrollments and progress %.
     - `lesson_progress`: Tracks student lesson completion status.
     - `course_versions`: Tracks course version history.
     - `course_reviews`: Tracks admin review history & feedback.

  2. Realtime:
     - Adds all course tables to `supabase_realtime` publication.
*/

-- 1. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  department_id text DEFAULT '',
  level text NOT NULL DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  duration_hours integer NOT NULL DEFAULT 0,
  instructor_id text NOT NULL DEFAULT '',
  instructor_name text NOT NULL DEFAULT 'Admin',
  instructor_role text NOT NULL DEFAULT 'admin',
  thumbnail text NOT NULL DEFAULT '',
  learning_objectives text[] DEFAULT '{}',
  prerequisites text[] DEFAULT '{}',
  skills_gained text[] DEFAULT '{}',
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED')),
  admin_feedback text DEFAULT '',
  enrolled_count integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select courses" ON courses;
CREATE POLICY "Allow select courses" ON courses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write courses" ON courses;
CREATE POLICY "Allow write courses" ON courses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Course Modules Table
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select course_modules" ON course_modules;
CREATE POLICY "Allow select course_modules" ON course_modules FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write course_modules" ON course_modules;
CREATE POLICY "Allow write course_modules" ON course_modules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Course Lessons Table
CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  lesson_type text NOT NULL DEFAULT 'VIDEO', -- 'VIDEO' | 'PDF' | 'DOC' | 'PPT' | 'TEXT' | 'EXTERNAL_LINK' | 'CODING_EXERCISE' | 'QUIZ' | 'ASSIGNMENT'
  description text DEFAULT '',
  video_url text DEFAULT '',
  resource_url text DEFAULT '',
  file_name text DEFAULT '',
  file_size bigint DEFAULT 0,
  rich_text text DEFAULT '',
  coding_problem jsonb DEFAULT '{}'::jsonb,
  quiz_data jsonb DEFAULT '{}'::jsonb,
  assignment_data jsonb DEFAULT '{}'::jsonb,
  duration_minutes integer DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select course_lessons" ON course_lessons;
CREATE POLICY "Allow select course_lessons" ON course_lessons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write course_lessons" ON course_lessons;
CREATE POLICY "Allow write course_lessons" ON course_lessons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Course Enrollments Table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'dropped'
  progress_pct numeric NOT NULL DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select course_enrollments" ON course_enrollments;
CREATE POLICY "Allow select course_enrollments" ON course_enrollments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write course_enrollments" ON course_enrollments;
CREATE POLICY "Allow write course_enrollments" ON course_enrollments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  completed_at timestamptz DEFAULT now(),
  CONSTRAINT unique_student_lesson UNIQUE (student_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select lesson_progress" ON lesson_progress;
CREATE POLICY "Allow select lesson_progress" ON lesson_progress FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write lesson_progress" ON lesson_progress;
CREATE POLICY "Allow write lesson_progress" ON lesson_progress FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Course Versions Table
CREATE TABLE IF NOT EXISTS course_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  version_number text NOT NULL,
  changelog text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select course_versions" ON course_versions;
CREATE POLICY "Allow select course_versions" ON course_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write course_versions" ON course_versions;
CREATE POLICY "Allow write course_versions" ON course_versions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. Course Reviews Table
CREATE TABLE IF NOT EXISTS course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  reviewer_id text NOT NULL,
  reviewer_name text NOT NULL,
  action text NOT NULL, -- 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'PUBLISHED'
  feedback text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select course_reviews" ON course_reviews;
CREATE POLICY "Allow select course_reviews" ON course_reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow write course_reviews" ON course_reviews;
CREATE POLICY "Allow write course_reviews" ON course_reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Supabase Realtime Publication for course tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE course_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE course_lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE course_enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE lesson_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE course_reviews;
