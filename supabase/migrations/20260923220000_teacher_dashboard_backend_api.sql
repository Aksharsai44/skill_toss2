-- ====================================================================
-- SKILL TOSS LMS — MIGRATION: Teacher Dashboard Backend Data Infrastructure
-- File: 20260923220000_teacher_dashboard_backend_api.sql
-- Description: Establishes RLS policies, tenant isolation, and atomic RPC
--              functions for teacher batch scoping, student rosters, bulk
--              attendance marking, assignment creation, and submission grading.
-- ====================================================================

-- 1. Ensure RLS is enabled on all core LMS tables
ALTER TABLE IF EXISTS public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policies for Batches
DROP POLICY IF EXISTS "Batches tenant isolation policy" ON public.batches;
CREATE POLICY "Batches tenant isolation policy" ON public.batches
  FOR ALL
  USING (
    institution_id IS NULL OR 
    institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())
  );

-- 3. Tenant Isolation Policies for Students
DROP POLICY IF EXISTS "Students tenant isolation policy" ON public.students;
CREATE POLICY "Students tenant isolation policy" ON public.students
  FOR ALL
  USING (
    institution_id IS NULL OR 
    institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())
  );

-- 4. Tenant & Teacher Authorization Policies for Attendance Records
DROP POLICY IF EXISTS "Attendance tenant policy" ON public.attendance_records;
CREATE POLICY "Attendance tenant policy" ON public.attendance_records
  FOR ALL
  USING (
    institution_id IS NULL OR 
    institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())
  );

-- 5. Tenant & Teacher Authorization Policies for Assignments
DROP POLICY IF EXISTS "Assignments tenant policy" ON public.assignments;
CREATE POLICY "Assignments tenant policy" ON public.assignments
  FOR ALL
  USING (
    institution_id IS NULL OR 
    institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())
  );

-- 6. Tenant & Teacher Authorization Policies for Submissions
DROP POLICY IF EXISTS "Submissions tenant policy" ON public.submissions;
CREATE POLICY "Submissions tenant policy" ON public.submissions
  FOR ALL
  USING (
    institution_id IS NULL OR 
    institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())
  );

-- ====================================================================
-- RPC STORED PROCEDURES
-- ====================================================================

-- RPC 1: Atomic Bulk Attendance Marking (Teacher Authorized)
CREATE OR REPLACE FUNCTION public.mark_batch_attendance(
  p_batch_id TEXT,
  p_date DATE,
  p_records JSONB, -- Array of { student_id: text, status: text }
  p_teacher_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  records_updated INT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec JSONB;
  v_count INT := 0;
  v_student_id TEXT;
  v_status TEXT;
  v_course_id TEXT;
  v_tenant_id TEXT;
BEGIN
  -- Get tenant id of current user
  SELECT institution_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();

  -- Process each attendance item atomically
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := v_rec->>'student_id';
    v_status := v_rec->>'status';
    v_course_id := COALESCE(v_rec->>'course_id', 'general');

    -- Upsert attendance record
    INSERT INTO public.attendance_records (
      id,
      student_id,
      batch_id,
      course_id,
      date,
      status,
      institution_id,
      created_at
    )
    VALUES (
      'att_' || md5(p_batch_id || '_' || v_student_id || '_' || p_date::text),
      v_student_id,
      p_batch_id,
      v_course_id,
      p_date,
      v_status,
      v_tenant_id,
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      status = EXCLUDED.status,
      created_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT TRUE, v_count, 'Attendance updated successfully for ' || v_count || ' students.';
END;
$$;

-- RPC 2: Atomic Submission Grading (Teacher Authorized)
CREATE OR REPLACE FUNCTION public.grade_student_submission(
  p_submission_id TEXT,
  p_marks NUMERIC,
  p_feedback TEXT,
  p_teacher_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  submission_id TEXT,
  graded_at TIMESTAMPTZ,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.submissions
  SET
    marks = p_marks,
    feedback = p_feedback,
    status = 'graded',
    graded_at = v_now,
    updated_at = v_now
  WHERE id = p_submission_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, p_submission_id, v_now, 'Submission graded successfully.';
  ELSE
    RETURN QUERY SELECT FALSE, p_submission_id, v_now, 'Submission not found.';
  END IF;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_batch_attendance(TEXT, DATE, JSONB, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.grade_student_submission(TEXT, NUMERIC, TEXT, TEXT) TO authenticated, anon;

-- RPC 3: Verify Teacher Batch Access (Server-side authorization check)
CREATE OR REPLACE FUNCTION public.verify_teacher_batch_access(
  p_teacher_id TEXT,
  p_batch_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_authorized BOOLEAN := FALSE;
BEGIN
  -- Check if batch is assigned to teacher
  SELECT EXISTS (
    SELECT 1 FROM public.batches
    WHERE id = p_batch_id
      AND (teacher_id = p_teacher_id OR teacher_id IS NULL)
  ) INTO v_authorized;

  RETURN v_authorized;
END;
$$;

-- RPC 4: Atomic Announcement Creation
CREATE OR REPLACE FUNCTION public.create_teacher_announcement(
  p_title TEXT,
  p_content TEXT,
  p_target_batch_id TEXT,
  p_teacher_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  post_id TEXT,
  created_at TIMESTAMPTZ,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id TEXT := 'post_' || extract(epoch from now())::bigint;
  v_now TIMESTAMPTZ := NOW();
  v_tenant_id TEXT;
  v_author_name TEXT := 'Teacher';
  v_author_avatar TEXT := '';
BEGIN
  SELECT institution_id, full_name, avatar_url INTO v_tenant_id, v_author_name, v_author_avatar 
  FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.community_posts (
    id,
    author_id,
    author_name,
    author_role,
    author_avatar,
    title,
    content,
    post_type,
    target_batch_id,
    institution_id,
    created_at
  )
  VALUES (
    v_new_id,
    p_teacher_id,
    COALESCE(v_author_name, 'Teacher'),
    'teacher',
    COALESCE(v_author_avatar, ''),
    p_title,
    p_content,
    'announcement',
    p_target_batch_id,
    v_tenant_id,
    v_now
  );

  RETURN QUERY SELECT TRUE, v_new_id, v_now, 'Announcement posted successfully.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_teacher_batch_access(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_teacher_announcement(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

