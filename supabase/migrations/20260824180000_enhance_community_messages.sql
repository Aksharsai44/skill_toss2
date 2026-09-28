-- Migration to enhance community_messages table for real-time chat, reactions, pinned messages, smart announcements, and edits

CREATE TABLE IF NOT EXISTS public.community_messages (
  id text PRIMARY KEY,
  batch_id text NOT NULL,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL DEFAULT 'student',
  sender_avatar text DEFAULT '',
  message_text text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  attachment_url text DEFAULT '',
  attachment_name text DEFAULT '',
  attachment_size text DEFAULT '',
  reply_to_id text DEFAULT '',
  reply_to_sender_name text DEFAULT '',
  reply_to_text text DEFAULT '',
  is_pinned boolean DEFAULT false,
  reactions jsonb DEFAULT '{}'::jsonb,
  read_by text[] DEFAULT '{}',
  announcement_title text DEFAULT '',
  announcement_target text DEFAULT '',
  announcement_date text DEFAULT '',
  edited_at timestamptz DEFAULT NULL,
  deleted_at timestamptz DEFAULT NULL,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Safely add missing columns
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS attachment_size text DEFAULT '';
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Ensure RLS policies exist
DROP POLICY IF EXISTS "Allow all read community_messages" ON public.community_messages;
DROP POLICY IF EXISTS "Allow all write community_messages" ON public.community_messages;

CREATE POLICY "Allow all read community_messages" ON public.community_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write community_messages" ON public.community_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for community_messages table if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
