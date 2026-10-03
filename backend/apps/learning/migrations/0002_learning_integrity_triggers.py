from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION learning_staff_can_manage_batch(actor_id uuid, target_batch_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM accounts_user actor
    JOIN academics_batch batch ON batch.id = target_batch_id
    WHERE actor.id = actor_id
      AND actor.is_active
      AND actor.institution_id = batch.institution_id
      AND batch.status = 'active'
      AND (
        actor.role IN ('super_admin', 'admin')
        OR (
          actor.role = 'teacher'
          AND EXISTS (
            SELECT 1 FROM academics_teacherassignment ta
            WHERE ta.batch_id = batch.id AND ta.teacher_id = actor.id AND ta.is_active
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION learning_validate_session_or_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_batch academics_batch%ROWTYPE;
BEGIN
  SELECT * INTO target_batch FROM academics_batch WHERE id = NEW.batch_id;
  IF target_batch.id IS NULL OR target_batch.institution_id <> NEW.institution_id OR target_batch.status <> 'active' THEN
    RAISE EXCEPTION 'learning record requires an active batch in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academics_subject subject
    WHERE subject.id = NEW.subject_id
      AND subject.institution_id = NEW.institution_id
      AND subject.course_id = target_batch.course_id
      AND subject.is_active
  ) THEN
    RAISE EXCEPTION 'subject must be active and belong to the batch course' USING ERRCODE = '23514';
  END IF;
  IF NOT learning_staff_can_manage_batch(NEW.created_by_id, NEW.batch_id) THEN
    RAISE EXCEPTION 'creator is not allowed to manage this batch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id
    OR NEW.batch_id <> OLD.batch_id
    OR NEW.subject_id <> OLD.subject_id
    OR NEW.created_by_id <> OLD.created_by_id
  ) THEN
    RAISE EXCEPTION 'learning record identity fields are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'learning_attendancesession' AND TG_OP = 'UPDATE'
     AND NEW.attendance_date <> OLD.attendance_date THEN
    RAISE EXCEPTION 'attendance date is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION learning_validate_attendance_record()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_session learning_attendancesession%ROWTYPE;
BEGIN
  SELECT * INTO target_session FROM learning_attendancesession WHERE id = NEW.session_id;
  IF target_session.id IS NULL OR target_session.institution_id <> NEW.institution_id OR target_session.status <> 'open' THEN
    RAISE EXCEPTION 'attendance requires an open session in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user student
    JOIN academics_studentenrollment enrollment
      ON enrollment.student_id = student.id
     AND enrollment.batch_id = target_session.batch_id
     AND enrollment.status = 'active'
    WHERE student.id = NEW.student_id
      AND student.role = 'student'
      AND student.is_active
      AND student.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'attendance requires an active enrolled student' USING ERRCODE = '23514';
  END IF;
  IF NOT learning_staff_can_manage_batch(NEW.marked_by_id, target_session.batch_id) THEN
    RAISE EXCEPTION 'marker is not allowed to manage this batch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id
    OR NEW.session_id <> OLD.session_id
    OR NEW.student_id <> OLD.student_id
  ) THEN
    RAISE EXCEPTION 'attendance ownership fields are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION learning_validate_submission()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_assignment learning_assignment%ROWTYPE;
BEGIN
  SELECT * INTO target_assignment FROM learning_assignment WHERE id = NEW.assignment_id;
  IF target_assignment.id IS NULL OR target_assignment.institution_id <> NEW.institution_id THEN
    RAISE EXCEPTION 'assignment and submission must share an institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user student
    JOIN academics_studentenrollment enrollment
      ON enrollment.student_id = student.id
     AND enrollment.batch_id = target_assignment.batch_id
     AND enrollment.status = 'active'
    WHERE student.id = NEW.student_id
      AND student.role = 'student'
      AND student.is_active
      AND student.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'submission requires an active enrolled student' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id
    OR NEW.assignment_id <> OLD.assignment_id
    OR NEW.student_id <> OLD.student_id
  ) THEN
    RAISE EXCEPTION 'submission ownership fields are immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('draft', 'submitted') THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'graded' THEN
      RAISE EXCEPTION 'graded submissions are immutable to students' USING ERRCODE = '23514';
    END IF;
    IF target_assignment.status <> 'published' OR statement_timestamp() > target_assignment.due_at THEN
      RAISE EXCEPTION 'assignment must be published and before its deadline' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'graded' THEN
    IF TG_OP = 'INSERT' OR OLD.status NOT IN ('submitted', 'graded') THEN
      RAISE EXCEPTION 'only submitted work can be graded' USING ERRCODE = '23514';
    END IF;
    IF NEW.response IS DISTINCT FROM OLD.response OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'grading cannot change submitted work' USING ERRCODE = '23514';
    END IF;
    IF NEW.marks < 0 OR NEW.marks > target_assignment.max_marks THEN
      RAISE EXCEPTION 'marks are outside the assignment range' USING ERRCODE = '23514';
    END IF;
    IF NOT learning_staff_can_manage_batch(NEW.graded_by_id, target_assignment.batch_id) THEN
      RAISE EXCEPTION 'grader is not allowed to manage this batch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER learning_attendance_session_integrity
BEFORE INSERT OR UPDATE ON learning_attendancesession
FOR EACH ROW EXECUTE FUNCTION learning_validate_session_or_assignment();
CREATE TRIGGER learning_assignment_integrity
BEFORE INSERT OR UPDATE ON learning_assignment
FOR EACH ROW EXECUTE FUNCTION learning_validate_session_or_assignment();
CREATE TRIGGER learning_attendance_record_integrity
BEFORE INSERT OR UPDATE ON learning_attendancerecord
FOR EACH ROW EXECUTE FUNCTION learning_validate_attendance_record();
CREATE TRIGGER learning_submission_integrity
BEFORE INSERT OR UPDATE ON learning_submission
FOR EACH ROW EXECUTE FUNCTION learning_validate_submission();

REVOKE ALL ON FUNCTION learning_staff_can_manage_batch(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION learning_validate_session_or_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION learning_validate_attendance_record() FROM PUBLIC;
REVOKE ALL ON FUNCTION learning_validate_submission() FROM PUBLIC;
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS learning_submission_integrity ON learning_submission;
DROP TRIGGER IF EXISTS learning_attendance_record_integrity ON learning_attendancerecord;
DROP TRIGGER IF EXISTS learning_assignment_integrity ON learning_assignment;
DROP TRIGGER IF EXISTS learning_attendance_session_integrity ON learning_attendancesession;
DROP FUNCTION IF EXISTS learning_validate_submission();
DROP FUNCTION IF EXISTS learning_validate_attendance_record();
DROP FUNCTION IF EXISTS learning_validate_session_or_assignment();
DROP FUNCTION IF EXISTS learning_staff_can_manage_batch(uuid, uuid);
"""


class Migration(migrations.Migration):
    dependencies = [("learning", "0001_initial")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
