-- Update resources schema for real-time file downloads, URLs, and download count tracking
CREATE TABLE IF NOT EXISTS public.resources (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  course_id text NOT NULL,
  batch_id text REFERENCES public.batches(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'PDF',
  uploaded_by text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Safely add missing columns
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS url text DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS subject text DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Enable Row Level Security
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid duplication
DROP POLICY IF EXISTS "Allow all read resources" ON public.resources;
DROP POLICY IF EXISTS "Allow all write resources" ON public.resources;

CREATE POLICY "Allow all read resources" ON public.resources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write resources" ON public.resources FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for resources table if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
