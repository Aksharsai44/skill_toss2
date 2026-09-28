/*
  # SkillToss Community Platform Schema Migration
  
  1. New Tables:
     - `community_posts`: Questions and educational discussion topics.
     - `community_answers`: Answers to questions and threaded replies.
     - `community_upvotes`: Tracks upvotes on posts and answers per user.
     - `community_bookmarks`: Tracks bookmarked/saved posts per user.
     - `community_follows`: Tracks followed discussions per user.
     - `community_reports`: Inappropriate content reports for Admin moderation.
  
  2. Security:
     - Enable Row Level Security (RLS) on all community tables.
     - Add public/authenticated policies for read, write, update, delete.
  
  3. Realtime:
     - Enable Supabase Realtime publication for `community_posts`, `community_answers`, `community_upvotes`, and `community_reports`.
*/

-- 1. Community Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'question', -- 'question' | 'discussion'
  author_id text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'student', -- 'student' | 'teacher' | 'admin'
  author_avatar text DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  tags text[] DEFAULT '{}',
  batch_id text DEFAULT '',
  department_id text DEFAULT '',
  attachment_url text DEFAULT '',
  attachment_name text DEFAULT '',
  is_pinned boolean DEFAULT false,
  is_solved boolean DEFAULT false,
  best_answer_id text DEFAULT '',
  views_count integer DEFAULT 0,
  upvotes_count integer DEFAULT 0,
  answers_count integer DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select community_posts" ON community_posts;
CREATE POLICY "Allow select community_posts" ON community_posts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert community_posts" ON community_posts;
CREATE POLICY "Allow insert community_posts" ON community_posts FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update community_posts" ON community_posts;
CREATE POLICY "Allow update community_posts" ON community_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete community_posts" ON community_posts;
CREATE POLICY "Allow delete community_posts" ON community_posts FOR DELETE TO anon, authenticated USING (true);

-- 2. Community Answers Table
CREATE TABLE IF NOT EXISTS community_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'student',
  author_avatar text DEFAULT '',
  content text NOT NULL,
  upvotes_count integer DEFAULT 0,
  is_best_answer boolean DEFAULT false,
  parent_answer_id text DEFAULT '',
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select community_answers" ON community_answers;
CREATE POLICY "Allow select community_answers" ON community_answers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert community_answers" ON community_answers;
CREATE POLICY "Allow insert community_answers" ON community_answers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update community_answers" ON community_answers;
CREATE POLICY "Allow update community_answers" ON community_answers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete community_answers" ON community_answers;
CREATE POLICY "Allow delete community_answers" ON community_answers FOR DELETE TO anon, authenticated USING (true);

-- 3. Community Upvotes Table
CREATE TABLE IF NOT EXISTS community_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  target_type text NOT NULL, -- 'post' | 'answer'
  target_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_target UNIQUE (user_id, target_type, target_id)
);

ALTER TABLE community_upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select community_upvotes" ON community_upvotes;
CREATE POLICY "Allow select community_upvotes" ON community_upvotes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert community_upvotes" ON community_upvotes;
CREATE POLICY "Allow insert community_upvotes" ON community_upvotes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete community_upvotes" ON community_upvotes;
CREATE POLICY "Allow delete community_upvotes" ON community_upvotes FOR DELETE TO anon, authenticated USING (true);

-- 4. Community Bookmarks Table
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_bookmark UNIQUE (user_id, post_id)
);

ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select community_bookmarks" ON community_bookmarks;
CREATE POLICY "Allow select community_bookmarks" ON community_bookmarks FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert community_bookmarks" ON community_bookmarks;
CREATE POLICY "Allow insert community_bookmarks" ON community_bookmarks FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete community_bookmarks" ON community_bookmarks;
CREATE POLICY "Allow delete community_bookmarks" ON community_bookmarks FOR DELETE TO anon, authenticated USING (true);

-- 5. Community Follows Table
CREATE TABLE IF NOT EXISTS community_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_follow UNIQUE (user_id, post_id)
);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select community_follows" ON community_follows;
CREATE POLICY "Allow select community_follows" ON community_follows FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert community_follows" ON community_follows;
CREATE POLICY "Allow insert community_follows" ON community_follows FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete community_follows" ON community_follows;
CREATE POLICY "Allow delete community_follows" ON community_follows FOR DELETE TO anon, authenticated USING (true);

-- 6. Community Reports Table
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reporter_name text NOT NULL,
  target_type text NOT NULL, -- 'post' | 'answer'
  target_id text NOT NULL,
  post_id text NOT NULL,
  reason text NOT NULL,
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'reviewed' | 'dismissed' | 'actioned'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select community_reports" ON community_reports;
CREATE POLICY "Allow select community_reports" ON community_reports FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert community_reports" ON community_reports;
CREATE POLICY "Allow insert community_reports" ON community_reports FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update community_reports" ON community_reports;
CREATE POLICY "Allow update community_reports" ON community_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete community_reports" ON community_reports;
CREATE POLICY "Allow delete community_reports" ON community_reports FOR DELETE TO anon, authenticated USING (true);

-- Enable Supabase Realtime Publication for community tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE community_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE community_upvotes;
ALTER PUBLICATION supabase_realtime ADD TABLE community_bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE community_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE community_reports;
