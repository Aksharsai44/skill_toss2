/*
# Add requester_type to leave_requests

1. Changes
- Add `requester_type` column to `leave_requests` table (text, default 'student')
  - 'student' = student leave request, routed to class teacher for approval
  - 'teacher' = teacher leave request, routed to admin for approval
- Add `teacher_name` column (text, nullable) — the class teacher assigned to review student leaves
2. Security
- No policy changes (existing anon+authenticated CRUD policies still apply)
*/

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS requester_type text NOT NULL DEFAULT 'student';

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS teacher_name text;
