from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION academics_validate_course_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM academics_department department
    WHERE department.id = NEW.department_id
      AND department.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'course and department must share an institution' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION academics_validate_subject_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM academics_course course
    WHERE course.id = NEW.course_id
      AND course.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'subject and course must share an institution' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION academics_validate_batch_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM academics_course course
    WHERE course.id = NEW.course_id
      AND course.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'batch and course must share an institution' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION academics_validate_teacher_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_batch academics_batch%ROWTYPE;
BEGIN
  SELECT * INTO target_batch FROM academics_batch WHERE id = NEW.batch_id;
  IF target_batch.id IS NULL OR target_batch.institution_id <> NEW.institution_id THEN
    RAISE EXCEPTION 'assignment and batch must share an institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user teacher
    WHERE teacher.id = NEW.teacher_id
      AND teacher.role = 'teacher'
      AND teacher.institution_id = NEW.institution_id
      AND (NOT NEW.is_active OR teacher.is_active)
  ) THEN
    RAISE EXCEPTION 'assignment requires a teacher in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NEW.is_active AND target_batch.status <> 'active' THEN
    RAISE EXCEPTION 'active assignment requires an active batch' USING ERRCODE = '23514';
  END IF;
  IF NEW.subject_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM academics_subject subject
    WHERE subject.id = NEW.subject_id
      AND subject.institution_id = NEW.institution_id
      AND subject.course_id = target_batch.course_id
      AND subject.is_active
  ) THEN
    RAISE EXCEPTION 'assigned subject must be active and belong to the batch course' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION academics_validate_student_enrollment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_batch academics_batch%ROWTYPE;
BEGIN
  SELECT * INTO target_batch FROM academics_batch WHERE id = NEW.batch_id;
  IF target_batch.id IS NULL OR target_batch.institution_id <> NEW.institution_id THEN
    RAISE EXCEPTION 'enrollment and batch must share an institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user student
    WHERE student.id = NEW.student_id
      AND student.role = 'student'
      AND student.institution_id = NEW.institution_id
      AND (NEW.status <> 'active' OR student.is_active)
  ) THEN
    RAISE EXCEPTION 'enrollment requires a student in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'active' AND target_batch.status <> 'active' THEN
    RAISE EXCEPTION 'active enrollment requires an active batch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION academics_validate_parent_student_link()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user parent
    WHERE parent.id = NEW.parent_id
      AND parent.role = 'parent'
      AND parent.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'link requires a parent in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user student
    WHERE student.id = NEW.student_id
      AND student.role = 'student'
      AND student.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'link requires a student in the same institution' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER academics_course_tenant_integrity
BEFORE INSERT OR UPDATE ON academics_course
FOR EACH ROW EXECUTE FUNCTION academics_validate_course_tenant();
CREATE TRIGGER academics_subject_tenant_integrity
BEFORE INSERT OR UPDATE ON academics_subject
FOR EACH ROW EXECUTE FUNCTION academics_validate_subject_tenant();
CREATE TRIGGER academics_batch_tenant_integrity
BEFORE INSERT OR UPDATE ON academics_batch
FOR EACH ROW EXECUTE FUNCTION academics_validate_batch_tenant();
CREATE TRIGGER academics_teacher_assignment_integrity
BEFORE INSERT OR UPDATE ON academics_teacherassignment
FOR EACH ROW EXECUTE FUNCTION academics_validate_teacher_assignment();
CREATE TRIGGER academics_student_enrollment_integrity
BEFORE INSERT OR UPDATE ON academics_studentenrollment
FOR EACH ROW EXECUTE FUNCTION academics_validate_student_enrollment();
CREATE TRIGGER academics_parent_student_link_integrity
BEFORE INSERT OR UPDATE ON academics_parentstudentlink
FOR EACH ROW EXECUTE FUNCTION academics_validate_parent_student_link();

REVOKE ALL ON FUNCTION academics_validate_course_tenant() FROM PUBLIC;
REVOKE ALL ON FUNCTION academics_validate_subject_tenant() FROM PUBLIC;
REVOKE ALL ON FUNCTION academics_validate_batch_tenant() FROM PUBLIC;
REVOKE ALL ON FUNCTION academics_validate_teacher_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION academics_validate_student_enrollment() FROM PUBLIC;
REVOKE ALL ON FUNCTION academics_validate_parent_student_link() FROM PUBLIC;
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS academics_parent_student_link_integrity ON academics_parentstudentlink;
DROP TRIGGER IF EXISTS academics_student_enrollment_integrity ON academics_studentenrollment;
DROP TRIGGER IF EXISTS academics_teacher_assignment_integrity ON academics_teacherassignment;
DROP TRIGGER IF EXISTS academics_batch_tenant_integrity ON academics_batch;
DROP TRIGGER IF EXISTS academics_subject_tenant_integrity ON academics_subject;
DROP TRIGGER IF EXISTS academics_course_tenant_integrity ON academics_course;
DROP FUNCTION IF EXISTS academics_validate_parent_student_link();
DROP FUNCTION IF EXISTS academics_validate_student_enrollment();
DROP FUNCTION IF EXISTS academics_validate_teacher_assignment();
DROP FUNCTION IF EXISTS academics_validate_batch_tenant();
DROP FUNCTION IF EXISTS academics_validate_subject_tenant();
DROP FUNCTION IF EXISTS academics_validate_course_tenant();
"""


class Migration(migrations.Migration):
    dependencies = [("academics", "0001_initial")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
