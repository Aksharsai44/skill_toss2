/*
# Create courses, lessons & certificate templates

1. New Tables
- `courses` — Udemy/Coursera-style courses created by admin or teacher
  - id, title, description, instructor_name, instructor_role ('admin'|'teacher'),
    thumbnail, category, level, duration_hours, price, status ('draft'|'published'),
    enrolled_count, created_at, updated_at
- `course_lessons` — Topics/lessons within a course (video-based)
  - id, course_id (FK -> courses), title, description, video_url, duration_minutes,
    sort_order, created_at
- `certificate_templates` — Certificate designs tied to courses
  - id, course_id (FK -> courses), title, issued_by, signature_text, border_style,
    created_at

2. Security
- RLS enabled on all tables.
- Single-tenant demo app (no sign-in) — anon + authenticated CRUD allowed, data is intentionally shared.

3. Notes
- course_lessons cascade-delete with their parent course.
- certificate_templates cascade-delete with their parent course.
*/

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  instructor_name text NOT NULL DEFAULT 'Admin',
  instructor_role text NOT NULL DEFAULT 'admin',
  thumbnail text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  level text NOT NULL DEFAULT 'Beginner',
  duration_hours integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  enrolled_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_courses" ON courses;
CREATE POLICY "anon_select_courses" ON courses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_courses" ON courses;
CREATE POLICY "anon_insert_courses" ON courses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_courses" ON courses;
CREATE POLICY "anon_update_courses" ON courses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_courses" ON courses;
CREATE POLICY "anon_delete_courses" ON courses FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lessons" ON course_lessons;
CREATE POLICY "anon_select_lessons" ON course_lessons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_lessons" ON course_lessons;
CREATE POLICY "anon_insert_lessons" ON course_lessons FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_lessons" ON course_lessons;
CREATE POLICY "anon_update_lessons" ON course_lessons FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_lessons" ON course_lessons;
CREATE POLICY "anon_delete_lessons" ON course_lessons FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Certificate of Completion',
  issued_by text NOT NULL DEFAULT 'Bright Future College',
  signature_text text NOT NULL DEFAULT 'Director of Studies',
  border_style text NOT NULL DEFAULT 'Classic',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cert_templates" ON certificate_templates;
CREATE POLICY "anon_select_cert_templates" ON certificate_templates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cert_templates" ON certificate_templates;
CREATE POLICY "anon_insert_cert_templates" ON certificate_templates FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cert_templates" ON certificate_templates;
CREATE POLICY "anon_update_cert_templates" ON certificate_templates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cert_templates" ON certificate_templates;
CREATE POLICY "anon_delete_cert_templates" ON certificate_templates FOR DELETE
  TO anon, authenticated USING (true);
