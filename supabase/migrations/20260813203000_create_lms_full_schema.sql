/*
  # SkillToss LMS Full Shared Data Schema Migration

  1. New Tables
     - `departments` (id, name)
     - `batches` (id, name, department_id, teacher_id, schedule)
     - `teachers` (id, name, email, phone, course_ids, batch_ids, avatar, status)
     - `students` (id, name, roll_no, batch_id, department_id, email, phone, parent_phone, address, emergency_contact, avatar, status)
     - `assignments` (id, title, course_id, batch_id, teacher_id, instructions, due_date, max_marks, attachment_name, status, created_at)
     - `submissions` (id, assignment_id, student_id, response, attachment_name, status, submitted_at, marks, feedback, graded_at)
     - `attendance_records` (id, student_id, course_id, batch_id, date, status)
     - `exams` (id, course_id, batch_id, title, date, start_time, duration_minutes, max_marks, syllabus, status)
     - `exam_results` (id, exam_id, student_id, marks, feedback)
     - `resources` (id, title, description, course_id, batch_id, type, uploaded_by, uploaded_at)
     - `class_sessions` (id, course_id, batch_id, teacher_id, date, start_time, end_time, mode, location, status)
     - `fee_invoices` (id, student_id, title, total, due_date, status)
     - `payments` (id, invoice_id, student_id, amount, method, reference, date, status, demo)
     - `receipts` (id, payment_id, invoice_id, student_id, amount, date, method, reference, status, demo)
     - `notifications` (id, user_id, type, title, message, timestamp, read, related_entity_id, path)
     - `events` (id, title, date, type, batch)
     - `goals` (id, student_id, title, category, target, deadline, progress, status)

  2. Security
     - Enable RLS on all tables with policies for public/authenticated read and write operations.
*/

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read departments" ON departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write departments" ON departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Batches
CREATE TABLE IF NOT EXISTS batches (
  id text PRIMARY KEY,
  name text NOT NULL,
  department_id text REFERENCES departments(id) ON DELETE SET NULL,
  teacher_id text,
  schedule text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read batches" ON batches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write batches" ON batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text DEFAULT '',
  course_ids text[] DEFAULT '{}',
  batch_ids text[] DEFAULT '{}',
  avatar text DEFAULT '',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read teachers" ON teachers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write teachers" ON teachers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY,
  name text NOT NULL,
  roll_no text NOT NULL UNIQUE,
  batch_id text REFERENCES batches(id) ON DELETE SET NULL,
  department_id text REFERENCES departments(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  phone text DEFAULT '',
  parent_phone text DEFAULT '',
  address text DEFAULT '',
  emergency_contact text DEFAULT '',
  avatar text DEFAULT '',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read students" ON students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write students" ON students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id text PRIMARY KEY,
  title text NOT NULL,
  course_id text NOT NULL,
  batch_id text REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id text,
  instructions text NOT NULL DEFAULT '',
  due_date text NOT NULL,
  max_marks integer NOT NULL DEFAULT 100,
  attachment_name text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read assignments" ON assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write assignments" ON assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id text PRIMARY KEY,
  assignment_id text REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  response text NOT NULL DEFAULT '',
  attachment_name text,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz DEFAULT now(),
  marks integer,
  feedback text,
  graded_at timestamptz
);
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read submissions" ON submissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write submissions" ON submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id text PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  batch_id text REFERENCES batches(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'present'
);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read attendance" ON attendance_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write attendance" ON attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  batch_id text REFERENCES batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL DEFAULT '10:00 AM',
  duration_minutes integer NOT NULL DEFAULT 60,
  max_marks integer NOT NULL DEFAULT 100,
  syllabus text DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read exams" ON exams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write exams" ON exams FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Exam Results
CREATE TABLE IF NOT EXISTS exam_results (
  id text PRIMARY KEY,
  exam_id text REFERENCES exams(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  marks integer NOT NULL DEFAULT 0,
  feedback text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read exam_results" ON exam_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write exam_results" ON exam_results FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  course_id text NOT NULL,
  batch_id text REFERENCES batches(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'PDF',
  uploaded_by text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read resources" ON resources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write resources" ON resources FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Class Sessions
CREATE TABLE IF NOT EXISTS class_sessions (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  batch_id text REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id text,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  mode text NOT NULL DEFAULT 'classroom',
  location text DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read class_sessions" ON class_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write class_sessions" ON class_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Fee Invoices
CREATE TABLE IF NOT EXISTS fee_invoices (
  id text PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  title text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read fee_invoices" ON fee_invoices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write fee_invoices" ON fee_invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  invoice_id text REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  reference text DEFAULT '',
  date date NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  demo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read payments" ON payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write payments" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id text PRIMARY KEY,
  payment_id text REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id text REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL,
  method text DEFAULT 'cash',
  reference text DEFAULT '',
  status text NOT NULL DEFAULT 'completed',
  demo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read receipts" ON receipts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write receipts" ON receipts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  type text NOT NULL DEFAULT 'academic',
  title text NOT NULL,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  read boolean DEFAULT false,
  related_entity_id text,
  path text
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write notifications" ON notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  title text NOT NULL,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'event',
  batch text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read events" ON events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write events" ON events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id text PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text DEFAULT 'Academic',
  target text DEFAULT '',
  deadline date,
  progress integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read goals" ON goals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all write goals" ON goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
