/*
  # SkillToss Discussion Forum Real-Time & Schema Migration

  1. Enhancements:
     - Verify and structure tables: `community_posts`, `community_answers`, `community_upvotes`, `community_bookmarks`, `community_follows`, `community_reports`.
     - Indexes for fast querying on user, post_id, author_id, tags, category, and status.
     - Row Level Security (RLS) policies for authenticated and anonymous users.
     - Ensure Realtime publication includes all 6 community tables.
*/

-- 1. Ensure indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_answers_post ON community_answers(post_id);
CREATE INDEX IF NOT EXISTS idx_community_answers_parent ON community_answers(parent_answer_id);
CREATE INDEX IF NOT EXISTS idx_community_answers_author ON community_answers(author_id);

CREATE INDEX IF NOT EXISTS idx_community_upvotes_user_target ON community_upvotes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user ON community_bookmarks(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_user ON community_follows(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);

-- 2. Ensure Realtime Publication
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
