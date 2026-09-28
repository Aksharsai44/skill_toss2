/*
  # SkillToss Community Messages Database Schema Migration

  1. New Tables
     - `community_messages`
       - `id` (text, primary key)
       - `batch_id` (text, channel ID e.g. 'batch_001', 'announcements')
       - `sender_id` (text)
       - `sender_name` (text)
       - `sender_role` (text, 'teacher' | 'student')
       - `sender_avatar` (text)
       - `message_text` (text)
       - `message_type` (text, 'text' | 'announcement' | 'resource' | 'image' | 'file')
       - `attachment_url` (text)
       - `attachment_name` (text)
       - `reply_to_id` (text)
       - `reply_to_sender_name` (text)
       - `reply_to_text` (text)
       - `is_pinned` (boolean)
       - `reactions` (jsonb)
       - `read_by` (text[])
       - `announcement_title` (text)
       - `announcement_target` (text)
       - `announcement_date` (text)
       - `created_at` (timestamptz)

  2. Security
     - Enable RLS on `community_messages`
     - Add public/authenticated policies for select, insert, update, delete
*/

CREATE TABLE IF NOT EXISTS community_messages (
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
  reply_to_id text DEFAULT '',
  reply_to_sender_name text DEFAULT '',
  reply_to_text text DEFAULT '',
  is_pinned boolean DEFAULT false,
  reactions jsonb DEFAULT '{}'::jsonb,
  read_by text[] DEFAULT '{}',
  announcement_title text DEFAULT '',
  announcement_target text DEFAULT '',
  announcement_date text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read community_messages" ON community_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write community_messages" ON community_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
