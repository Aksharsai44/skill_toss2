-- Migration to enhance resources table and add atomic download count increment procedure

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

-- Safely add missing columns if not present
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS url text DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS subject text DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_name text DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_size integer DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'batch';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Ensure RLS policies exist
DROP POLICY IF EXISTS "Allow all read resources" ON public.resources;
DROP POLICY IF EXISTS "Allow all write resources" ON public.resources;

CREATE POLICY "Allow all read resources" ON public.resources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write resources" ON public.resources FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Atomic download count increment function
CREATE OR REPLACE FUNCTION increment_resource_download(resource_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.resources
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = resource_id
  RETURNING download_count INTO new_count;

  IF new_count IS NULL THEN
    RETURN 0;
  END IF;

  RETURN new_count;
END;
$$;

-- Enable Realtime for resources table if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
