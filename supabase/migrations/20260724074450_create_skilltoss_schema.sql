/*
# Skill Toss LMS — Core Schema

Creates the foundational tables for the Skill Toss LMS platform.
This is a demo/single-tenant app (no sign-in screen — users pick a role to explore),
so all policies use TO anon, authenticated with USING (true) for intentionally shared data.

1. New Tables
- `notes` — Student personal notes (create, edit, delete, download)
  - id, title, content, author_name, created_at, updated_at
- `leave_requests` — Student/teacher leave requests with approval workflow
  - id, student_name, batch, leave_from, leave_to, reason, status, created_at
- `forum_posts` — Discussion forum posts (Quora/Twitter style)
  - id, author_name, author_role, content, tags, likes, comments, created_at
- `messages` — Automated message log (WhatsApp, email, SMS)
  - id, channel, recipient, subject, status, created_at

2. Security
- RLS enabled on all tables.
- All tables allow anon + authenticated CRUD (single-tenant demo app, data is intentionally shared).
*/

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT 'Arjun Verma',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE
  TO anon, authenticated USING (true);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  batch text NOT NULL,
  leave_from date NOT NULL,
  leave_to date NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leaves" ON leave_requests;
CREATE POLICY "anon_select_leaves" ON leave_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_leaves" ON leave_requests;
CREATE POLICY "anon_insert_leaves" ON leave_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_leaves" ON leave_requests;
CREATE POLICY "anon_update_leaves" ON leave_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_leaves" ON leave_requests;
CREATE POLICY "anon_delete_leaves" ON leave_requests FOR DELETE
  TO anon, authenticated USING (true);

-- Forum posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'student',
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_forum" ON forum_posts;
CREATE POLICY "anon_select_forum" ON forum_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_forum" ON forum_posts;
CREATE POLICY "anon_insert_forum" ON forum_posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_forum" ON forum_posts;
CREATE POLICY "anon_update_forum" ON forum_posts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_forum" ON forum_posts;
CREATE POLICY "anon_delete_forum" ON forum_posts FOR DELETE
  TO anon, authenticated USING (true);

-- Messages log table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);
